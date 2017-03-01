module.exports.getGroupVelocity = function(waves) {
    switch(waves.length) {
        case 0:
            return 0;

        case 1:
            return waves[0].omega / waves[0].k;

        case 2:
            return (waves[0].omega - waves[1].omega) / (waves[0].k - waves[1].k);
    }
};


module.exports.getPacketWidth = function(waves) {
    switch(waves.length) {
        case 0:
            return 0;

        case 1:
            return 2 * 2 * Math.PI / waves[0].k;

        case 2:
            return 2 * 2 * Math.PI / (waves[0].k - waves[1].k);
    }
};

module.exports.getPhasePoints = function(waves, t) {
    var v, u, x, y;

    switch(waves.length) {
        case 0:
            return [];

        case 1:
            v = waves[0].omega / waves[0].k;
            x = v * t;
            y = waves[0].A * Math.cos(waves[0].omega * t - waves[0].k * x + waves[0].phi);

            return [[x, y, v]];

        case 2:
            v = (waves[0].omega + waves[1].omega) / (waves[0].k + waves[1].k);
            u = (waves[0].omega - waves[1].omega) / (waves[0].k - waves[1].k);

            // var lambda = 2 * Math.PI / (waves[0].k + waves[1].k);
            x = v * t;

            y = 0;
            y += waves[0].A * Math.cos(waves[0].omega * t - waves[0].k * x + waves[0].phi);
            y += waves[1].A * Math.cos(waves[1].omega * t - waves[1].k * x + waves[1].phi);

            return [[x, y, v]];
    }
};