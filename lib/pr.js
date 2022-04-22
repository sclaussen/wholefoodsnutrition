'use strict';


const d = require('debug')('pr');
const clicolor = require('cli-color');
const YAML = require('yaml');


function p(d) {
    return function(label, value) {

        if (!d.enabled) {
            return;
        }

        if (value) {
            d(clicolor.yellowBright(label) + ': ' + clicolor.blueBright(JSON.stringify(value)));
            return;
        }

        if (typeof label === 'object') {
            d(clicolor.yellowBright(JSON.stringify(label)));
            return;
        }

        d(clicolor.yellowBright(label));
    };
}


function p4(d) {
    return function(label, value) {

        if (!d.enabled) {
            return;
        }

        if (value) {
            d(clicolor.yellowBright(label) + ': ' + clicolor.blueBright(JSON.stringify(value, null, 4)));
            return;
        }

        d(clicolor.yellowBright(JSON.stringify(label, null, 4)));
    };
}


function y4(d) {
    return function(label, value) {

        if (!d.enabled) {
            return;
        }

        if (value) {
            d(clicolor.yellowBright(label) + ': ' + clicolor.blueBright(JSON.stringify(value, null, 4)));
            return;
        }

        d(clicolor.yellowBright(YAML.stringify(label, null, 4)));
    };
}


function e(d) {
    return function(label, value) {

        if (!d.enabled) {
            return;
        }

        if (value) {
            d(clicolor.yellowBright('Entering: ' + label + ': ' + JSON.stringify(value)));
            return;
        }

        d(clicolor.yellowBright('Entering: ' + label));
    };
}


function e4(d) {
    return function(label, value) {

        if (!d.enabled) {
            return;
        }

        if (value) {
            d(clicolor.yellowBright('Entering: ' + label + ': ' + JSON.stringify(value, null, 4)));
            return;
        }

        d(clicolor.yellowBright('Entering: ' + label));
    };
}


function ex(d) {
    return function(label, value) {

        if (!d.enabled) {
            return;
        }

        if (value) {
            d(clicolor.yellowBright('Exiting: ' + label + ': ' + JSON.stringify(value)));
            return;
        }

        d(clicolor.yellowBright('Exiting: ' + label));
    };
}


function ex4(d) {
    return function(label, value) {

        if (!d.enabled) {
            return;
        }

        if (value) {
            d(clicolor.yellowBright('Exiting: ' + label + ': ' + JSON.stringify(value, null, 4)));
            return;
        }

        d(clicolor.yellowBright('Exiting: ' + label));
    };
}


module.exports.p = p;
module.exports.p4 = p4;
module.exports.y4 = y4;
module.exports.e = e;
module.exports.e4 = e4;
module.exports.ex = ex;
module.exports.ex4 = ex4;
