package expo.modules.handtracker

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.SystemClock
import android.util.Log
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Camera preview that runs MediaPipe hand (2 hands) and pose tracking on each
 * frame, on the phone, and sends the points to JavaScript as onFrame events.
 *
 * Coordinates are normalised in the raw, upright camera image, not mirrored,
 * matching the training videos and the web build. The preview is mirrored for
 * the front camera by PreviewView itself. Nothing leaves the device.
 */
class HandTrackerView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onFrame by EventDispatcher()
  private val onError by EventDispatcher()

  private val previewView = PreviewView(context).apply {
    scaleType = PreviewView.ScaleType.FILL_CENTER
    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
  }
  private val analysisExecutor: ExecutorService = Executors.newSingleThreadExecutor()

  private var cameraProvider: ProcessCameraProvider? = null
  private var hands: HandLandmarker? = null
  private var pose: PoseLandmarker? = null
  private var facing = "front"
  private var active = true
  private var started = false
  private var lastFrameMs = 0L
  private var lastTimestampMs = 0L

  init {
    addView(previewView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  fun setFacing(value: String) {
    if (value == facing && started) return
    facing = value
    if (started) bindCamera()
  }

  fun setActive(value: Boolean) {
    active = value
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (!started) {
      started = true
      analysisExecutor.execute { loadModels() }
      bindCamera()
    }
  }

  private fun loadModels() {
    try {
      hands = HandLandmarker.createFromOptions(
        context,
        HandLandmarker.HandLandmarkerOptions.builder()
          .setBaseOptions(BaseOptions.builder().setModelAssetPath("hand_landmarker.task").setDelegate(Delegate.CPU).build())
          .setRunningMode(RunningMode.VIDEO)
          .setNumHands(2)
          .build()
      )
      pose = PoseLandmarker.createFromOptions(
        context,
        PoseLandmarker.PoseLandmarkerOptions.builder()
          .setBaseOptions(BaseOptions.builder().setModelAssetPath("pose_landmarker_lite.task").setDelegate(Delegate.CPU).build())
          .setRunningMode(RunningMode.VIDEO)
          .build()
      )
    } catch (e: Exception) {
      Log.e(TAG, "MediaPipe failed to load", e)
      post { onError(mapOf("code" to "noModel", "message" to (e.message ?: "MediaPipe failed to load"))) }
    }
  }

  private fun bindCamera() {
    val owner = appContext.currentActivity as? LifecycleOwner
    if (owner == null) {
      onError(mapOf("code" to "noCamera", "message" to "No activity to attach the camera to"))
      return
    }
    val future = ProcessCameraProvider.getInstance(context)
    future.addListener({
      try {
        val provider = future.get()
        cameraProvider = provider
        val preview = Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }
        val analysis = ImageAnalysis.Builder()
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
          .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
          .build()
          .also { it.setAnalyzer(analysisExecutor, ::analyze) }
        val selector = if (facing == "back") CameraSelector.DEFAULT_BACK_CAMERA else CameraSelector.DEFAULT_FRONT_CAMERA
        provider.unbindAll()
        provider.bindToLifecycle(owner, selector, preview, analysis)
      } catch (e: Exception) {
        Log.e(TAG, "Camera failed to start", e)
        onError(mapOf("code" to "noCamera", "message" to (e.message ?: "Camera failed to start")))
      }
    }, ContextCompat.getMainExecutor(context))
  }

  private fun analyze(image: ImageProxy) {
    try {
      val handModel = hands
      val poseModel = pose
      val now = SystemClock.uptimeMillis()
      // ~30 fps, the rate the classifier was trained on
      if (!active || handModel == null || poseModel == null || now - lastFrameMs < FRAME_MS) return
      lastFrameMs = now
      val timestamp = maxOf(now, lastTimestampMs + 1) // MediaPipe needs strictly increasing timestamps
      lastTimestampMs = timestamp

      val upright = rotate(image.toBitmap(), image.imageInfo.rotationDegrees)
      val mpImage = BitmapImageBuilder(upright).build()
      val h = handModel.detectForVideo(mpImage, timestamp)
      val p = poseModel.detectForVideo(mpImage, timestamp)

      val handList = h.landmarks().mapIndexed { i, points ->
        mapOf(
          "label" to (h.handedness().getOrNull(i)?.firstOrNull()?.categoryName() ?: "Right"),
          "points" to points.map { listOf(it.x().toDouble(), it.y().toDouble(), it.z().toDouble()) }
        )
      }
      val poseList = p.landmarks().firstOrNull()?.map {
        mapOf(
          "x" to it.x().toDouble(),
          "y" to it.y().toDouble(),
          "z" to it.z().toDouble(),
          "visibility" to (it.visibility().orElse(1f)).toDouble()
        )
      }
      val payload = mapOf("t" to timestamp.toDouble(), "hands" to handList, "pose" to poseList)
      post { onFrame(payload) }
    } catch (e: Exception) {
      Log.w(TAG, "Frame skipped", e)
    } finally {
      image.close()
    }
  }

  private fun rotate(bitmap: Bitmap, degrees: Int): Bitmap {
    if (degrees == 0) return bitmap
    val m = Matrix().apply { postRotate(degrees.toFloat()) }
    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, m, true)
  }

  fun release() {
    active = false
    cameraProvider?.unbindAll()
    analysisExecutor.execute {
      hands?.close()
      pose?.close()
      hands = null
      pose = null
    }
    analysisExecutor.shutdown()
  }

  companion object {
    private const val TAG = "HandTracker"
    private const val FRAME_MS = 33L
  }
}
