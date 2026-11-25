package expo.modules.handtracker

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class HandTrackerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HandTracker")

    View(HandTrackerView::class) {
      Events("onFrame", "onError")

      Prop("facing") { view: HandTrackerView, facing: String ->
        view.setFacing(facing)
      }

      Prop("active") { view: HandTrackerView, active: Boolean ->
        view.setActive(active)
      }

      OnViewDestroys { view: HandTrackerView ->
        view.release()
      }
    }
  }
}
