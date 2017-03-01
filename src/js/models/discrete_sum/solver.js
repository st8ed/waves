var beats = require('./beats'),
    math  = require('./math'),
    _     = require('../../ui')._;

/////////////////////////////////////////////////////////////////////////////////////////////////////////
module.exports = function() {
    // Constants
    var myPi = 3.1415;
    var decimalPlaces = 3;
    var eps = 0.1;


    // Uninitialised
    var solvedGeneral;
    var solvedParticular;
    var errorString;

    var waves;
    var wavesMap;
    var n;
    var A, b;

    var x0;
    var v;
    var m;
    var t0;
    var nearestTime;
    var nearestSolution;
    var waveData;

    var stack = []; // Do it another way
    function push() {
        var entry = {};

        entry.A = A;
        entry.b = b;
        entry.x0 = x0;
        entry.v = v;
        entry.m = m;
        entry.t0 = t0;
        entry.nearestTime = nearestTime;
        entry.nearestSolution = nearestSolution;
        entry.waveData = waveData;

        stack.push(entry);
    }

    function pop() {
        var entry = stack.pop();

        A = entry.A;
        b = entry.b;
        x0 = entry.x0;
        v = entry.v;
        m = entry.m;
        t0 = entry.t0;
        nearestTime = entry.nearestTime;
        nearestSolution = entry.nearestSolution;
        waveData = entry.waveData;
    }

    var getPosition = function(i, n, t) {
        return math.add(
            math.multiply(waves[i].v, math.bignumber(t)),
            math.multiply(n, waves[i].len)
        );
    };

    // Used as matrix coefficients
    var T = function(i, j) {
        if(math.equal(waves[i].v, waves[j].v))
            throw _('There are components with equal velocities! (unimplemented)');

        return math.divide(
            waves[j].len,
            math.subtract(waves[i].v, waves[j].v)
        );
    };

    // Builds two matrices for linear system of equations
    function buildMatrices(m0) {
        A = math.zeros(n - 1, n).map(function(zero, index) {
            return (index[1] === (index[0] + 1)) ? math.multiply(-1, T(0, index[1])) : ((index[1] === 0) ? 1 : 0);
        });

        b = math.zeros(n - 1, 1).map(function(zero, index) {
            return math.multiply(T(index[0] + 1, 0), m0);
        });
    }

    // Solves one diophantine equation corresponding to a pair of linear equations
    function solvePair(i, j) {
        // Extract coefficients
        var a = math.inv(v.get([i, 0]));
        var b = math.multiply(math.bignumber(-1), math.inv(v.get([j, 0])));
        var c = math.subtract(
            math.divide(x0.get([i, 0]), v.get([i, 0])),
            math.divide(x0.get([j, 0]), v.get([j, 0]))
        );

        // Make integers
        var gcd = a.getNominator().gcd(b.getNominator().gcd(c.getNominator()));
        var lcm = a.getDenumerator().lcm(b.getDenumerator().lcm(c.getDenumerator()));
        var m = lcm.div(gcd);

        a = math.multiply(a, m);
        b = math.multiply(b, m);
        c = math.multiply(c, m);

        console.assert(a.isInt() && b.isInt() && c.isInt(), _('Simplification failed'));

        // Solve
        var solution = math.intsolve(a, b, c);

        // No solution
        if(solution === null) {
            // console.log('Diophantine equation coefficients: ');
            // console.log(a.toString());
            // console.log(b.toString());
            // console.log(c.toString());

            throw _('No integer solutions for waves') + ' ' + (waves[0].index + 1) + ', ' + (waves[i].index + 1) + ' ' + _('and') + ' ' + (waves[j].index + 1);
        }

        return solution;
    }

    // Gets solution if m[i] = value
    // As a special case if i == 0 returns solution for specific time
    function getSolution(i, value) {
        var u = math.divide(
            math.subtract(value, x0.get([i, 0])),
            v.get([i, 0])
        );

        var X = math.add(x0, math.multiply(u, v));

        // TODO Simplify me
        var t = X.get([0, 0]);
        var crests = [m[0]];

        // todo forEach?
        for(var j = 1; j < n; j++)
            crests.push(X.get([j, 0]));

        return [t, crests];
    }

    // Checks particular solution
    function checkSolution(solution) {
        var positions = [getPosition(0, m[0], solution[0])];

        for(var j = 1; j < n; j++)
            positions.push(getPosition(j, solution[1][j], solution[0]));

        // TODO Better check
        console.assert(
            !!positions.reduce(function(a, b) {
                return (Math.abs(a - b) < 1e-3) ? a : NaN;
            }),
            _('Wrong particular solution')
        );
    }

    // TODO: cache for z
    // Search for nearest moment in time so t > t0 given m[i] = N * m_u + m_0
    function findNearest(t0, i, m_0, m_u, direction) {
        var u0 = math.divide(
            math.subtract(m_0, x0.get([i, 0])),
            v.get([i, 0])
        );

        var u = math.divide(
            m_u,
            v.get([i, 0])
        );

        // t = p*z + q
        var p = math.multiply(v.get([0, 0]), u);
        var q = math.add(
            x0.get([0, 0]),
            math.multiply(v.get([0, 0]), u0)
        );

        console.assert(!p.isZero(), 'p is zero');

        var f1 = direction == 1 ? math.ceil : math.floor;
        var f2 = direction == 1 ? math.floor : math.ceil;
        var f = (p > 0) ? f1 : f2;

        var z = f(
            math.subtract(math.bignumber(t0), q).div(p)
        );

        var time = math.add(math.multiply(z, p), q);

        return [time, [i, math.add(math.multiply(z, m_u), m_0)]];
    }

    // Finds general solution for specific m0 and any time
    function solveGeneral(m0) {
        buildMatrices(m0);

        var solution = math.linsolve(A, b);

        // Check solution
        if(solution[0] === null) {
            console.assert(solution[1] === null);
            throw 'Linear system is inconsistent';
        }

        if(solution[1] === null || solution[1].length === 0)
            throw 'Linear system has only one solution';

        if(solution[1].length > 1)
            throw 'Linear system solution isn\'t a curve!';

        if(!solution[1][0].valueOf().every(function(x) {
                return !math.isZero(x[0]);
            }))
            throw 'Linear system solution has zeros!';

        // Decompose solution
        x0 = solution[0];
        v = solution[1][0];

        // For all pairs of waves, i, j = 1,..,n-1
        m = [m0];

        // There is no pairs left
        if(n == 2) {
            m.push([[0, 1]]); // The simplest solution
            return;
        }

        for(var i = 1; i < n; i++) {
            for(var j = i + 1; j < n; j++) {
                var solution = solvePair(i, j, x0, v);

                (m[i] = m[i] || []).push(solution[0]);
                (m[j] = m[j] || []).push(solution[1]);
            }
        }
    }

    // Finds particular solution for specific time
    function solveParticular(time, direction) {
        // console.log('Zero solution: ');
        // checkSolution(1, 0);

        // console.log(1, m0);
        t0 = time;
        nearestTime = direction * Infinity;
        nearestSolution = null;

        for(var i = 1; i < n; i++) {
            m[i].forEach(function(value) {
                var m_0 = value[0];
                var m_u = value[1];

                var rendezvous = findNearest(t0, i, m_0, m_u, direction);

                if(
                    (direction == 1 && rendezvous[0] < nearestTime) ||
                    (direction == -1 && rendezvous[0] > nearestTime)
                ) {
                    nearestTime = rendezvous[0];
                    nearestSolution = rendezvous[1];
                }


                // check only nearestSol?^
                // TODO remove me
                // for(var x = -1; x <= 1; x++)
                // checkSolution(getSolution(i, math.add(math.multiply(m_u, x), m_0)));
            });
        }

        if(!isFinite(nearestTime) || nearestSolution === null)
            throw 'No closest time';

        // Expand solution
        nearestSolution = getSolution(nearestSolution[0], nearestSolution[1]);

        // Check?
        // console.assert(nearestSolution[0] == nearestTime)
    }

    this.reset = function(waves_) {
        solvedGeneral = 0;
        solvedParticular = 0;
        waveData = undefined;

        if(waves_) {
            // Special case
            if(waves_.length <= 2) {
                waveData = [
                    beats.getGroupVelocity(waves_),
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    beats.getPacketWidth(waves_)
                ];

                waves = undefined;
                errorString = "";
                return;
            }

            // Store wave parameters
            waves = [];
            var velocities = [];

            for(var i = 0; i < waves_.length; i++) {
                var wave = {};

                wave.index = i;
                wave.omega = math.bignumber(waves_[i].omega).toDecimalPlaces(decimalPlaces);
                wave.k = math.bignumber(waves_[i].k).toDecimalPlaces(decimalPlaces);
                if(math.isZero(wave.k)) {
                    waves = undefined;
                    errorString = _('(General solution)') + ': ' + _('There is a wave where k is zero!');
                    return;
                }

                wave.len = math.divide(math.bignumber(2 * myPi), wave.k);
                wave.v = math.divide(wave.omega, wave.k);

                if(velocities.indexOf(+wave.v) !== -1)
                    continue;

                velocities.push(+wave.v);
                waves.push(wave);
            }

            n = waves.length;

            if(n < 2) {
                // May be we still can calculate wave data
                if(waves_.length > 1) { // We've just got many copies with the same velocity
                    var v = math.number(waves[0].v);
                    var len = Math.abs(2 * Math.PI / ((waves_[0].k - waves_[1].k) / 2));

                    waveData = [
                        math.number(v),
                        [0, 0],
                        [0, 0],
                        [0, 0],
                        [0, 0],
                        len
                    ];
                    debugger;
                }

                waves = undefined;
                errorString = "";
                return;
            }

            waves.sort(function(a, b) {
                return math.compare(a.len, b.len);
            });

        } else
            waves = undefined;

    };

    this.find = function(m0_, time) {
        if(waves === undefined)
            return;

        // Look for general solution
        if(solvedGeneral === 0 || (solvedGeneral == 1 && m[0] !== m0_)) {
            solvedParticular = 0;

            try {
                solveGeneral(m0_);
                solvedGeneral = 1;

            } catch(error) {
                errorString = _('(General solution)') + ': ' + error;
                //console.error(errorString);
                solvedGeneral = -1;

                // throw error;
                return;
            }
        }

        // Look for particular solution then
        if(solvedGeneral == 1) {
            if(
                solvedParticular === 0 ||
                (solvedParticular == 1 && ((time < t0 || time > nearestTime))) // Resolve it
            ) {
                try {
                    solveParticular(time, -1);
                    var t1 = nearestTime;
                    var x1 = getPosition(0, nearestSolution[1][0], t1);

                    ////////////////////////
                    var m0_peak = nearestSolution[1][0];
                    var x_peak = x1;
                    var t_peak = t1;

                    // console.log('--------------');
                    // console.log('Peak for m: ', math.number(m0_peak));
                    // console.log('Peak: ', math.number(x_peak), 't: ', math.number(t_peak));

                    // Find sign
                    var sign = waves.every(function(wave, index) {
                        if(index === 0)
                            return true;

                        return (
                            (math.larger(waves[0].v, wave.v) && math.smaller(waves[0].len, wave.len)) ||
                            (math.smaller(waves[0].v, wave.v) && math.larger(waves[0].len, wave.len))
                        );

                    }) ? 1 : -1;

                    //// Find another peak
                    push();
                    solveGeneral(math.add(m0_peak, sign));
                    solveParticular(t_peak, 1);

                    var t_ = nearestTime;
                    var x_ = getPosition(0, nearestSolution[1][0], t_);
                    pop();
                    //// End

                    var dt = math.subtract(t_, t_peak);
                    var dx = math.subtract(x_, x_peak);
                    var u = (math.isZero(dt)) ? Infinity : math.divide(dx, dt);

                    ////////////////////////

                    solveParticular(time, 1);
                    var t2 = nearestTime;
                    var x2 = getPosition(0, nearestSolution[1][0], t2);

                    //console.log(math.format(x1));
                    //console.log(math.format(x2));
                    //console.log(sign);

                    // Update for what we have obtained
                    t0 = math.number(t1);
                    nearestTime = math.number(nearestTime);

                    // Wave data
                    waveData = [
                        math.number(u),
                        [math.number(x_peak), math.number(x_)],
                        [math.number(t_peak), math.number(t_)],
                        [math.number(x1), math.number(x2)],
                        [math.number(t1), math.number(t2)],
                        //math.number(u * (t2 - t1))
                        Math.abs(4 * Math.PI / math.number((waves[waves.length - 1].k - waves[0].k)))
                        //math.number( (x2 - x1) * math.abs( waves[waves.length-1].k - waves[0].k ) / waves[0].len )
                    ];

                    solvedParticular = 1;

                } catch(error) {
                    errorString = _('(Particular solution)') + ': ' + error;
                    //console.error(errorString);
                    solvedParticular = -1;

                    // throw error;
                    return;
                }
            }

            if(solvedParticular == 1) {
                var result = {};

                nearestSolution[1].forEach(function(crest, index) {
                    result[waves[index].index] = math.number(getPosition(index, crest, time));
                });

                return result;

            }
        }
    };

    this.getWaveData = function() {
        return (waveData !== undefined && math.unequal(waveData[0], Infinity)) ? waveData : null;
    };

    this.getError = function() {
        return errorString;
    };

    this.isReady = function() {
        return typeof waves !== 'undefined';
    }
};
