# QuickCuts

QuickCuts is a browser-based tool designed for extracting multiple segments from a single video file quickly and efficiently. By leveraging FFmpeg.wasm, all video processing happens locally on your machine. This ensures that your video files are never uploaded to a server, providing a high level of privacy and reducing bandwidth usage.

## Features

The application provides a streamlined workflow for video editors and content creators who need to batch-process clips:

- **Sharp & Solid UI:** A high-contrast design featuring diagonal "clipped" geometry and zero rounded edges for a precise editing experience.
- **Timeline-based Marking:** Use the visual timeline to set start and end points for segments.
- **Manual Time Entry:** Fine-tune segment boundaries by entering precise timestamps.
- **Mobile-First Accessibility:** A fully responsive layout with large touch targets and readable typography (Lexend) designed for all age groups.
- **Offline Support:** Fully functional offline via Service Workers once visited, allowing for video processing without an active internet connection.
- **Theme Toggle:** Switch between Dark and Light modes to suit your workspace environment.
- **Dual Export Modes:** Choose between Fast Export for instant cuts and Accurate Export for frame-perfect re-encoding.
- **Batch Downloads:** All processed clips are packaged into a single ZIP archive for easy management.

## Technical Overview

QuickCuts is built using modern web technologies to push the boundaries of browser-based processing:

- **FFmpeg.wasm:** Handles the heavy lifting of video processing directly in the browser via WebAssembly.
- **SharedArrayBuffer Multi-threading:** Optimized for speed using multi-core processing through custom Service Worker headers.
- **JSZip:** Dynamically generates the ZIP archive for batch exports.
- **Vanilla JavaScript and CSS:** Ensures a lightweight and high-performance user interface without unnecessary dependencies.

## Hosting & Deployment

QuickCuts is designed to be hosted on GitHub Pages. It utilizes a Service Worker to handle the necessary Cross-Origin Isolation (COOP/COEP) headers, ensuring the application has access to high-performance multi-threading features in a static hosting environment.

## Connect

- **GitHub:** [MSameer0](https://github.com/MSameer0)
- **LinkedIn:** [Muhammad Sameer Adnan](https://www.linkedin.com/in/muhammad-sameer-adnan-58655534b)

## License

This project is protected by a restrictive license. You are permitted to study the source code for educational and research purposes. However, redistribution, modification for commercial use, or hosting of this site or any derivative works is prohibited without prior written consent. Please refer to the LICENSE file for more details.

## Browser Support

This application requires a browser that supports WebAssembly and SharedArrayBuffer. It is recommended to use the latest versions of Chrome, Firefox, or Edge for the best performance.
