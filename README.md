# Interactive wave propagation simulator

A simple application to help one develop practical understanding of wave propagation laws. It's suitable for use in teaching and perhaps in engineering. There is a pleathora of tweakable parameters to play with.

## Demo

![Screenshot](https://st8ed.github.io/waves/demo.gif)

Demo is available at https://st8ed.github.io/waves.

## Features

- Arbitrary waveforms and physical mediums are available
- Specification of waves by parameters of their harmonic components
- Simulation of various dispersive physical mediums by specifying their equations in both explicit and implicit form
- Configurable presets with export/import support (file-based)
- Live preview with custom interactive plotting widgets and controls
- Cross platform. No installation is required

## Usage

Just download HTML file from "GitHub Releases" and open it with your preferred Web browser.

## Used by

This project was approbated and used in teaching of some physics courses of Electromagnetism at MIET (National Research University of Electronic Technology, Russia) during 2017-2018.

## Status of the project

The application has not received any significant updates since the beginning of 2017. Currently I do not plan to introduce new features.   

## Build locally

Yarn package manager is required. Run the following command to build distributable copy in `dist/waves.hml`:

```bash
  make
```

You are also encouraged to perform build inside Docker container with proper Node version. Makefile target is available
for quick deployment of such container:

```bash
  make docker-shell
```

## Tech Stack

JavaScript, jQuery, math libraries (MathJS, JMat). Browserify for building.

Math library (MathJS) was specifically modified to support arbitrary precision fractions and operations on them.


## Authors

- [Kirill Konstantinov](https://github.com/st8ed)

## License

MIT
  
## Feedback

If you have any feedback, please reach out to me.