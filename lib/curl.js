'use strict';
var d = require('debug')('curl');

var _ = require('lodash');

var request = require('request');
var fs = require('fs');
var YAML = require('js-yaml');
var util = require('util');

var colors = require('colors');

var postRequest = util.promisify(request.post);
var getRequest = util.promisify(request.get);
var putRequest = util.promisify(request.put);
var patchRequest = util.promisify(request.patch);
var deleteRequest = util.promisify(request.delete);
var headRequest = util.promisify(request.head);

const p = require('./pr').p(d);
const p4 = require('./pr').p4(d);
const e = require('./pr').e(d);
const e4 = require('./pr').e4(d);
const ex = require('./pr').ex(d);
const ex4 = require('./pr').ex4(d);


async function post(url, credentials, body, headers, tlsOptions) {
    return await postHelper(url, credentials, body, headers, null, null, tlsOptions);
}


async function post200(url, credentials, body, headers, tlsOptions) {
    return await postHelper(url, credentials, body, headers, null, null, tlsOptions);
}


async function postMulti(url, credentials, filesByValue, filesByReference, headers, tlsOptions) {
    if (!headers) {
        headers = {};
    } else {
        headers = _.cloneDeep(headers);
    }
    addHeaderIfNotExists(headers, 'Content-Type', 'multipart/form-data');
    addHeaderIfNotExists(headers, 'Accept', 'application/json');

    return await postHelper(url, credentials, null, headers, filesByValue, filesByReference, tlsOptions);
}


async function postHelper(url, credentials, body, headers, filesByValue, filesByReference, tlsOptions) {
    if (!headers) {
        headers = {};
    } else {
        headers = _.cloneDeep(headers);
    }
    addHeaderIfNotExists(headers, 'Content-Type', 'application/json');
    addHeaderIfNotExists(headers, 'Accept', 'application/json');

    return await curl('POST', url, credentials, body, headers, filesByValue, filesByReference, tlsOptions);
}


async function get(url, credentials, headers, tlsOptions) {
    if (!headers) {
        headers = {};
    } else {
        headers = _.cloneDeep(headers);
    }
    addHeaderIfNotExists(headers, 'Accept', 'application/json');

    return await curl('GET', url, credentials, null, headers, null, null, tlsOptions);
}


async function getWithBody(url, credentials, body, headers, tlsOptions) {
    if (!headers) {
        headers = {};
    } else {
        headers = _.cloneDeep(headers);
    }
    addHeaderIfNotExists(headers, 'Content-Type', 'application/json');
    addHeaderIfNotExists(headers, 'Accept', 'application/json');

    return await curl('GET', url, credentials, body, headers, null, null, tlsOptions);
}


async function put(url, credentials, body, headers, tlsOptions) {
    if (!headers) {
        headers = {};
    } else {
        headers = _.cloneDeep(headers);
    }
    addHeaderIfNotExists(headers, 'Content-Type', 'application/json');
    addHeaderIfNotExists(headers, 'Accept', 'application/json');

    return await curl('PUT', url, credentials, body, headers, null, null, tlsOptions);
}


async function putMulti(url, credentials, filesByValues, filesByReference, headers, tlsOptions) {
    if (!headers) {
        headers = {};
    } else {
        headers = _.cloneDeep(headers);
    }
    addHeaderIfNotExists(headers, 'Content-Type', 'multipart/form-data');
    addHeaderIfNotExists(headers, 'Accept', 'application/json');

    return await curl('PUT', url, credentials, null, headers, filesByValues, filesByReference, tlsOptions);
}


async function patch(url, credentials, body, headers, tlsOptions) {
    if (!headers) {
        headers = {};
    } else {
        headers = _.cloneDeep(headers);
    }
    addHeaderIfNotExists(headers, 'Content-Type', 'application/json');
    addHeaderIfNotExists(headers, 'Accept', 'application/json');

    return await curl('PATCH', url, credentials, body, headers, null, null, tlsOptions);
}


async function patchMulti(url, credentials, filesByValues, filesByReference, headers, tlsOptions) {
    if (!headers) {
        headers = {};
    } else {
        headers = _.cloneDeep(headers);
    }
    addHeaderIfNotExists(headers, 'Content-Type', 'multipart/form-data');
    addHeaderIfNotExists(headers, 'Accept', 'application/json');

    return await curl('PATCH', url, credentials, null, headers, filesByValues, filesByReference, tlsOptions);
}


async function del(url, credentials, headers, tlsOptions) {
    if (!headers) {
        headers = {};
    } else {
        headers = _.cloneDeep(headers);
    }
    addHeaderIfNotExists(headers, 'Accept', 'application/json');

    return await curl('DELETE', url, credentials, null, headers, null, null, tlsOptions);
}


async function del204(url, credentials, headers, tlsOptions) {
    if (!headers) {
        headers = {};
    } else {
        headers = _.cloneDeep(headers);
    }
    addHeaderIfNotExists(headers, 'Accept', 'application/json');

    return await curl('DELETE', url, credentials, null, headers, null, null, tlsOptions);
}


async function delWithBody(url, credentials, body, headers, tlsOptions) {
    if (!headers) {
        headers = {};
    } else {
        headers = _.cloneDeep(headers);
    }
    addHeaderIfNotExists(headers, 'Content-Type', 'application/json');
    addHeaderIfNotExists(headers, 'Accept', 'application/json');

    return await curl('DELETE', url, credentials, body, headers, null, null, tlsOptions);
}


async function head(url, credentials, headers, tlsOptions) {
    return await curl('HEAD', url, credentials, null, headers, null, null, tlsOptions);
}


async function options(url, credentials, headers, tlsOptions) {
    return await curl('OPTIONS', url, credentials, headers, null, null, tlsOptions);
}


async function curl(verb, url, credentials, body, headers, filesByValue, filesByReference, tlsOptions) {
    let options = {
        uri: url,
        headers: headers,
        rejectUnauthorized: true,
        requestCert: true
    };
    p(options);

    if (tlsOptions) {
        // options.rejectUnauthorized = tlsOptions;
        options = _.extend(options, tlsOptions);
    }

    if (headers.Accept === 'application/octet-stream') {
        // leave octet-stream responses as Buffers
        options.encoding = null;
    }

    if (credentials) {
        options.auth = setCredentials(credentials);
    }

    if (body) {
        if (headers['Content-Type'] && headers['Content-Type'] === 'application/octet-stream') {
            // Don't JSON.stringify octet-stream request bodies
            options.body = body;
        } else {
            options.body = (typeof body !== 'string') ? JSON.stringify(body) : body;
        }
    }

    if (filesByValue || filesByReference) {
        options.formData = {};
        _.each(filesByValue, function(filesByValue) {
            options.formData[_.keys(filesByValue)] = '\'' + JSON.stringify(_.values(filesByValue)) + '\'';
        });

        addMultipartFormData(options, filesByReference);
    }

    logCurl(verb, options, filesByValue, filesByReference);

    let response;
    switch (verb) {
    case 'POST':
        response = await postRequest(options);
        break;
    case 'GET':
        response = await getRequest(options);
        break;
    case 'PUT':
        response = await putRequest(options);
        break;
    case 'PATCH':
        response = await patchRequest(options);
        break;
    case 'DELETE':
        response = await deleteRequest(options);
        break;
    case 'HEAD':
        response = await headRequest(options);
        break;
    }

    if (headers.Accept === 'application/json' && response.body) {
        try {
            let responseBody = JSON.parse(response.body, null, 4);
            response.body = responseBody;
        } catch (err) {
            // do nothing, some request's response.body is non-parsable
            // e.g posting a message to slack server, the response.body
            // returned is simple a string of "ok"
            // TODO: @shane need a better way to handle this case.
        }
    }

    if (headers.Accept === 'application/yaml' && response.body) {
        try {
            let responseBody = YAML.safeDump(YAML.safeLoad(response.body), { indent: 4 });
            response.body = responseBody;
        } catch (err) {
            // do nothing, some request's response.body is non-parsable
            // e.g posting a message to slack server, the response.body
            // returned is simple a string of "ok"
            // TODO: @shane need a better way to handle this case.
        }
    }

    logResponse(response, headers);

    return response;
}


function setCredentials(credentials) {
    if (credentials.indexOf(':') > 0) {
        let userAndPassword = _.split(credentials, ':');
        return {
            user: userAndPassword[0],
            pass: userAndPassword[1]
        };
    }

    return {
        bearer: credentials
    };
}


function logCurl(verb, options, filesByValue, filesByReference) {

    let command;
    let headers = '';
    _.transform(options.headers, function(result, value, key) {
        headers = headers + '-H \'' + key + ':' + value + '\' ';
    }, {});

    let credentialsPassword = '';
    if (options.auth && options.auth.user) {
        credentialsPassword = '-u \'' + options.auth.user + ':' + options.auth.pass + '\'';
    } else if (options.auth && options.auth.bearer) {
        credentialsPassword = '-H \'Authorization:Bearer ' + options.auth.bearer + '\'';
    }

    let url = options.uri;

    if (filesByValue || filesByReference) {
        command = 'curl -X ' + verb + ' ' + url + ' ' + headers + '-i -s -k ' + credentialsPassword;
        _.each(filesByValue, function(filesByValue) {
            command += ' -F ' + _.keys(filesByValue)[0] + '=@' + _.values(filesByValue)[0];
        });
        _.each(filesByReference, function(filesByReference) {
            command += ' -F ' + _.keys(filesByReference)[0] + '=\'' + JSON.stringify(_.values(filesByReference)[0]) + '\'';
        });
    } else if (options.body) {
        command = 'curl -X ' + verb + ' \'' + url + '\' ' + headers + '-i -s -k ' + credentialsPassword + ' -d \'' + options.body + '\'';
    } else {
        command = 'curl -X ' + verb + ' \'' + url + '\' ' + headers + '-i -s -k ' + credentialsPassword;
    }

    dgreen(command);
}


function logResponse(response, headers) {
    if (!debugSet('curl')) {
        return;
    }

    let debugSegments = process.env.DEBUG.split(',');
    if (!debugSegments.includes('curl')) {
        return;
    }

    dblue('HTTP/1.1 ' + response.statusCode + ' ' + response.statusMessage);
    for (let headerName of _.keys(response.headers)) {
        let rawHeadersIndex = _.findIndex(response.rawHeaders, function(rawHeaderName) {
            return rawHeaderName.toLowerCase() === headerName;
        });
        dblue(response.rawHeaders[rawHeadersIndex] + ': ' + response.headers[headerName]);
    }

    console.log(' ');
    if (headers.Accept === 'application/json') {
        dblue(JSON.stringify(response.body, null, 4));
    } else {
        dblue(response.body);
    }
}


function addHeaderIfNotExists(headers, name, value) {
    if (!headers[name]) {
        headers[name] = value;
    }
}


function dblue(msg) {
    console.log(msg.blue.bold);
}


function dgreen(msg) {
    if (!debugSet('curl')) {
        return;
    }

    console.log(' '.blue);
    console.log(' '.blue);
    console.log(' '.blue + msg.green);
}


function addMultipartFormData(options, filesByReference) {

    if (!filesByReference || filesByReference.length === 0) {
        return;
    }

    if (!options) {
        options = {};
    }

    if (!options.formData) {
        options.formData = {};
    }


    // Sample input for filesByReference:
    // [
    //     {
    //         gateway_service_urls: [
    //         ],
    //         product: [
    //             __dirname + '/data/climbon100.yaml;application/yaml'
    //         ],
    //         openapi: [
    //             __dirname + '/data/routes100.yaml;application/yaml',
    //             __dirname + '/data/trails100.yaml;application/yaml'
    //         ]
    //     }
    // ]
    for (let file of filesByReference) {

        // field = gateway_service_urls, product, or openapi
        for (let field of _.keys(file)) {

            if (!options.formData[field]) {
                options.formData[field] = [];
            }

            for (let entry of file[field]) {
                let file = _.first(entry.split(';'));
                let contentType = _.last(entry.split(';'));
                options.formData[field].push({
                    value: fs.createReadStream(file),
                    options: {
                        contentType: contentType
                    }
                });
            }
        }
    }
}


function debugSet(key) {
    if (!process.env.DEBUG) {
        return false;
    }

    let debugSegments = process.env.DEBUG.split(',');
    return debugSegments.includes(key);
}



module.exports = curl;
module.exports.curl = curl;
module.exports.post = post;
module.exports.post200 = post200;
module.exports.postMulti = postMulti;
module.exports.get = get;
module.exports.getWithBody = getWithBody;
module.exports.put = put;
module.exports.putMulti = putMulti;
module.exports.patch = patch;
module.exports.patchMulti = patchMulti;
module.exports.del = del;
module.exports.delWithBody = delWithBody;
module.exports.del204 = del204;
module.exports.head = head;
module.exports.options = options;
module.exports.addHeaderIfNotExists = addHeaderIfNotExists;
