module.exports.findPeaks = function(data) {
    var pL, pC, pR; // Left, center, right

    var minimums = [];
    var maximums = [];

    for(var i = 2; i < data.length; i++) {
        pR = data[i];
        pC = data[i - 1];
        pL = data[i - 2];

        var d1 = pC - pL;
        var d2 = pR - pC;


        if(d1 > 0 && d2 <= 0)
            maximums.push(i);
        else if(d1 < 0 && d2 >= 0)
            minimums.push(i);
    }

    return [maximums, minimums];
};

module.exports.findPeakVelocities = function(previous, current) {
    var i, j;
    var ret = [];
    var n = current.length;

    if(n < 3 || previous.length < 3) {
        for(i = 0; i < n; i++)
            ret.push(0);

        return ret;
    }

    var minShift;
    var minShiftValue = Infinity;

    for(var shift = -5; shift <= 5; shift++) { // 5 is magic here
        for(i = 0; i < 3; i++) {
            // i = 0;
            j = i + shift;
            if(j >= 0 && j < previous.length) {
                var shiftValue = Math.abs(current[i] - previous[j]);

                if(shiftValue < minShiftValue) {
                    minShiftValue = shiftValue;
                    minShift = shift;
                }
            }
        }
    }

    for(i = 0; i < n; i++) {
        j = i + minShift;
        if(j >= 0 && j < previous.length && i != n - 1 && i != 0) {
            ret.push((current[i] - previous[j]));
        } else {
            ret.push(0);
        }
    }

    window.pr = previous;
    window.nxt = current;
    window.sh = minShift;

    return ret;
};