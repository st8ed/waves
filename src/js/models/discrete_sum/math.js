var mathCore = require('mathjs/core'),
   math     = mathCore.create();

math.import(require('mathjs/lib')); // We need constants.js in 'lib', so import everything
// var math = require('mathjs');
math.config({number: 'BigNumber', precision: 600});

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper functions
var rowIndices = function(a, startIndex, id) {
    return math.index(
        id,
        math.range(startIndex, math.size(a).valueOf()[1])
    );
};

var mulRow = function(a, startIndex, id, s) {
    var indices = rowIndices(a, startIndex, id);

    return a.subset(
        indices,
        math.multiply(a.subset(indices), s)
    );
};

var subMul = function(a, startIndex, idFrom, s, idTo) {
    var indicesFrom = rowIndices(a, startIndex, idFrom);
    var indicesTo = rowIndices(a, startIndex, idTo);

    return a.subset(
        indicesTo,
        math.subtract(a.subset(indicesTo), math.multiply(a.subset(indicesFrom), s))
    );
};

// pivots is strictly monotone sequence!
math.ref = function(a, pivots) {
    // Prepare scope
    //var a = math.clone(a); // TODO fix me
    var rows = math.size(a).valueOf()[0];
    var columns = math.size(a).valueOf()[1];

    var get = function(row, col) {
        return a.get([row, col]);
    };

    // Column of pivot for each row
    pivots = pivots || [];
    get(0, 0);

    // Gaussian elimination
    for(var row = 0, col = 0; row < rows && col < columns; col++) {
        var maxValue = math.abs(get(row, col));
        var maxValueRow = row;

        if(rows - row > 1) {
            // TODO Optimize?
            math.forEach(a.subset(math.index(math.range(row, rows), col)), function(value, index) {
                if(math.larger(math.abs(value), maxValue)) {
                    maxValue = math.abs(value);
                    maxValueRow = index[0] + row;
                }
            });
        }

        // No pivot for this column
        if(math.isZero(get(maxValueRow, col)))
            continue;	// Skip only this column (row index remains unchanged!)

        // Swap if need
        if(maxValueRow != row)
            a.swapRows(row, maxValueRow);

        // Pivot is now 1
        a = mulRow(a, col, row, math.inv(get(row, col)));

        // Zero elements of row below
        for(var i = row + 1; i < rows; i++) {
            if(!math.isZero(get(i, col))) {
                a = subMul(a, col, row, get(i, col), i);
                //a[i][col] = C(0); // make extra-sure it's 0, avoid numerical imprecision // TODO +1 in above
            }
        }

        // More to the next row & column
        pivots.push(col);
        row++;
    }

    return a;
};

math.rref = function(ref, pivots) {
    // Prepare scope
    //var a = math.clone(ref); // todo fix me
    var a = ref;

    var get = function(row, col) {
        return a.get([row, col]);
    };

    // Zero elements of rows above each pivot
    for(var row = 0; row < pivots.length; row++) {
        var col = pivots[row];

        for(var i = row - 1; i >= 0; i--) {
            if(!math.isZero(get(i, col))) {
                a = subMul(a, col, row, get(i, col), i);
                //a.e[y][col] = C(0); // make extra-sure it's 0, avoid numerical imprecision // TODO +1 in above
            }
        }
    }

    return a;
};

// Solves linear system A * X = b
// Returns an array [particular solution, [basis vectors for all solutions]]
math.linsolve = function(a, b) {
    // Constants
    var n = a.size()[1]; // Unknowns
    var m = a.size()[0]; // Equations

    var rows = m;
    var columns = n;
    var homogeneous = math.deepEqual(b, math.zeros(n, 1));

    // First step is forward gauss substitution (row echelon form)
    var ab = !homogeneous ? math.concat(a, b, 1) : a;
    var boundVariables = [];
    var r = math.ref(ab, boundVariables); // Pivot positions also indicate columns of bound variables.

    // Solve homogeneous system for nontrivial solutions (a.k.a find nontrivial null space/kernel of operator)
    function solveHomogeneous() {
        // No free variables - so we've got only trivial solution
        if(boundVariables.length == n)
            return null;

        // Get basis vectors corresponding to free variables
        var basis = [];
        for(var x = 0, i = 0; x < n; x++) {
            // Since boundVariables is strictly monotonic increasing sequence,
            // it is easy to get indices of free variables from it. (missing numbers)
            if(i >= boundVariables.length || boundVariables[i] != x) {
                var v = math.zeros(n, 1);
                v.set([x, 0], 1);

                basis.push(v);
            }

            else
                i++;
        }

        // Gauss backward substitution
        // Loop through rows corresponding to bound variables
        for(var row = boundVariables.length - 1; row >= 0; row--) {
            var x = boundVariables[row];
            var col = x;

            console.assert(math.equal(r.get([row, col]), 1), 'Pivot point must be 1');

            // Solve variable in each basis vector
            basis.map(function(v) {
                // We got a row:
                // 0 0 ... 0 1 A B C ... = 0, where 1 is in x column and A B C are in solved variables columns
                // so express bound variable x via solved variables

                // Multiply row by solved variables
                var value = math.multiply(
                    r.subset(math.index(row, math.range(0, columns))),
                    v.subset(math.index(math.range(0, n), 0))
                );

                // It seems value may turn out to be 1x1 matrix, so get rid of this wrap
                if(math.typeof(value) == 'Matrix')
                    value = value.get([0, 0]);

                // Finally solve this variable
                v.set([x, 0], math.multiply(-1, value)); // Should be divided by 1 as well (pivot point)

                return v;
            });
        }

        return basis;
    }

    // May be there's nothing to do left
    if(homogeneous)
        return [math.zeros(n, 0), solveHomogeneous()];

    // Solve non-homogeneous system
    function solveNonHomogeneous() {
        // Reduce row echelon form for augmented matrix
        var rr = math.rref(r, boundVariables);

        var solution = math.zeros(n, 1);

        // Gauss backward substitution
        for(var x = 0, row = 0; row < rows; row++) {
            var col = x;

            for(; col < columns + 1; col++) {
                // First non-zero element in a row
                if(!math.isZero(rr.get([row, col]))) {
                    if(col == columns) // Augmented part's column index
                        return null; // Inconsistent system

                    solution.set([col, 0], rr.get([row, columns]));
                    x = col + 1;

                    break;
                }
            }

            // Nothing left to do (reached augmented part)
            if(col == columns)
                break;
        }

        return solution;
    }

    var particular = solveNonHomogeneous();

    return [particular, (particular !== null) ? solveHomogeneous() : null];
};

// Finds integer solutions of ax + by = c (diophantine equation)
math.intsolve = function(a, b, c) {
    var particular = math.bignumber(math.xgcd(a, b)).valueOf();

    if(!math.isZero(math.mod(c, particular[0])))
        return null;

    var m = math.divide(c, particular[0]);
    var ans = [
        [math.multiply(particular[1], m), math.divide(b, particular[0])],
        [math.multiply(particular[2], m), math.multiply(math.bignumber(-1), math.divide(a, particular[0]))]
    ];

    console.assert(math.equal(
        math.add(
            math.multiply(a, ans[0][0]),
            math.multiply(b, ans[1][0])
        ),
        c
    ), 'Diophantine solution check failed 1');

    console.assert(math.isZero(
        math.add(
            math.multiply(a, math.multiply(ans[0][1], math.bignumber(1337))),
            math.multiply(b, math.multiply(ans[1][1], math.bignumber(1337)))
        )
    ), 'Diophantine solution check failed 2');

    return ans;
};

// Finish
module.exports = math;

