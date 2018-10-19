var builder = require('junit-report-builder');
var path = require('path');

function getTestName(testData, state) {
    return [
        testData.suite.fullName.trim(),
        (state || testData.state).name.trim(),
        testData.browserId.replace(/ /g, '')
    ].join('.').replace(/ /g, '_');
}

/**
 * @param {object} gemini
 * @param {object} options
 * @param {string} options.path
 */
module.exports = function(gemini, options) {
    var finishedTests = [];
    var suite = builder.testSuite().name('Suite');
    var testCases = {};

    gemini.on('startRunner', function(runner) {
        runner.on('beginState', function(data) {
            var name = getTestName(data);
            testCases[name] = suite.testCase().name(name);
        });

        runner.on('skipState', function(data) {
            var name = getTestName(data);
            testCases[name] = suite.testCase().name(name).skipped();
            finishedTests.push(name);
        });

        runner.on('testResult', function(data) {
            var name = getTestName(data);

            if(data.equal !== true) {
                testCases[name].failure();
            }

            finishedTests.push(name);
        });

        runner.on('err', function(data) {
            if (data.state) {
                failTest(data);
            } else {
                failAllSuiteTests(data);
            }

            function failTest(data, name) {
                name = name || getTestName(data);
                testCases[name].error(data.message);
            }

            function failAllSuiteTests(data) {
                data.suite.states.forEach(function(state) {
                    var name = getTestName(data, state);
                    if (finishedTests.indexOf(name) === -1) {
                        failTest(data, name);
                    }
                });
            }
        });
    });

    gemini.on('endRunner', function() {
        builder.writeTo(path.join(options.path || '', 'gemini-junit-report.xml'));
    });
};
