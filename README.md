# QuickCuts

QuickCuts is a browser-based tool designed for extracting multiple segments from a single video file quickly and efficiently. By leveraging FFmpeg.wasm, all video processing happens locally on your machine. This ensures that your video files are never uploaded to a server, providing a high level of privacy and reducing bandwidth usage.

## Features

The application provides a streamlined workflow for video editors and content creators who need to batch-process clips:

*   Timeline-based Marking: Use the visual timeline to set start and end points for segments.
*   Manual Time Entry: Fine-tune segment boundaries by entering precise timestamps.
*   Segment Length Display: View the duration of each marked segment before exporting.
*   Dual Export Modes: Choose between Fast Export for instant cuts and Accurate Export for frame-perfect re-encoding.
*   Batch Downloads: All processed clips are packaged into a single ZIP archive for easy management.

## Technical Overview

QuickCuts is built using modern web technologies:

*   FFmpeg.wasm: Handles the heavy lifting of video processing directly in the browser via WebAssembly.
*   JSZip: Dynamically generates the ZIP archive for batch exports.
*   Vanilla JavaScript and CSS: Ensures a lightweight and responsive user interface without unnecessary dependencies.

## Hosting

QuickCuts is designed to be hosted on GitHub Pages. Due to the requirements of FFmpeg.wasm, the hosting environment must support Cross-Origin Isolation. This ensures that the application has access to the necessary browser features for high-performance video processing.

## License

This project is protected by a restrictive license. You are permitted to study the source code for educational and research purposes. However, redistribution, modification for commercial use, or hosting of this software or any derivative works is prohibited without prior written consent. Please refer to the LICENSE file for more details.

## Browser Support

This application requires a browser that supports WebAssembly and SharedArrayBuffer. It is recommended to use the latest versions of Chrome, Firefox, or Edge for the best performance.
