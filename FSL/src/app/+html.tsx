import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Web page shell. The Content-Security-Policy is a backstop for SignBridge's
 * promise that nothing leaves the device: the page may only connect to the
 * server it came from (plus the dev server's reload socket).
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta httpEquiv="Content-Security-Policy" content="connect-src 'self' blob: data: ws://localhost:* ws://127.0.0.1:*" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
