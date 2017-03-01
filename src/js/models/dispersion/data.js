var fft = require('fft-js').fft,
    fftUtil = require('fft-js').util;

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function Data(config) {
    this.period = config.period;
    this.n = config.n;

    this.sampleRate = this.n / this.period;
    this.step = this.period / this.n;

    this.maxA = 1;
    this.nyqFreq = 0.5 * this.sampleRate; // Nyquist frequency

    if(config.xs && config.ys && config.xs.length == config.ys.length && config.xs.length == this.n) {
        this.xs = config.xs;
        this.ys = config.ys;
        this.lookup = {};

        for(var i = 0; i < this.n; i++)
            this.lookup[this.xs[i]] = i;

    } else {
        this.xs = [];
        this.ys = [];
        this.lookup = {};

        for(var x = -this.period / 2; this.xs.length < this.n; x += this.step) {
            this.xs.push(x);
            this.ys.push(0);
            this.lookup[x] = this.xs.length - 1;
        }
    }

    this.analyse();
}

Data.prototype.toJSON = function() {
    return {
        period: this.period,
        sampleRate: this.sampleRate,
        xs: this.xs,
        ys: this.ys
    };
};

Data.prototype.setY = function(x, y) {
    this.ys[this.lookup[x]] = y;
};

Data.prototype.analyse = function() {
    this.image = fft(this.ys);
    this.frequencies = fftUtil.fftFreq(this.image, this.sampleRate);
    this.magnitudes = fftUtil.fftMag(this.image);

    for(var i = 0; i < this.magnitudes.length; i++)
        this.magnitudes[i] = this.magnitudes[i] / this.n * 2;
};

Data.prototype.sampleRealWave = function(x, t, phaseFunc) {
    var superposition = 0;

    superposition += this.image[0][0] / this.n; // Need additional term in case omega != 0 if k = 0

    for(var i = 1; i <= this.n / 2; i++) {
        var k = (i / this.n) * this.sampleRate * (2 * Math.PI);
        var phase = phaseFunc(x, t, k);

        var a = this.image[i][0];
        var b = this.image[i][1];

        var c = Math.cos(phase);
        var d = Math.sin(phase);
        var res = a * c - b * d; // Complex multiplication

        if(i != this.n / 2)
            superposition += 2 * res / this.n;
        else
            superposition += res / this.n;
    }

    return superposition;
};

module.exports = Data;
