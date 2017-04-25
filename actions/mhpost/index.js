/*
 * Copyright 2017 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 *  Use Watson API to translate message with provided watson translation
 *  username the watson translation api username
 *  password the watson translation api password
 *  the message to translate to
 *  By default, translate the message from en to es.
 */
function translate(username, password, message) {
    var promise = new Promise(function (resolve, reject) {
            var LanguageTranslatorV2 = require('watson-developer-cloud/language-translator/v2');

            var language_translator = new LanguageTranslatorV2({
                username: username,
                password: password,
                url: 'https://gateway.watsonplatform.net/language-translator/api/'
            });

            language_translator.translate({
                    text: message, source: 'en', target: 'es'
                },
                function (err, translation) {
                    if (err)
                        reject(err);
                    else
                        resolve(translation);
                });
        }
    );
    return promise;
}

/**
 * Process incoming message and publish it to Message Hub or Kafka.
 * This code is used as the OpenWhisk Action implementation and linked to a trigger via a rule.
 */
function mhpost(args) {
  console.log("DEBUG: Received message as input: " + JSON.stringify(args));

  return new Promise(function(resolve, reject) {
    if (!args.topic || !args.events || !args.events[0] || !args.kafka_rest_url || !args.api_key || !args.username || !args.password)
      reject("Error: Invalid arguments. Must include topic, events[], kafka_rest_url, api_key, translation service username and password. ");

    // construct CF-style VCAP services JSON
    var vcap_services = {
      "messagehub": [{
        "credentials": {
          "kafka_rest_url": args.kafka_rest_url,
          "api_key": args.api_key
        }
      }]
    };

    var MessageHub = require('message-hub-rest');
    var kafka = new MessageHub(vcap_services);
    translate(args.username, args.password, args.events[0].payload.sentence).then(text => {
        console.log("DEBUG: Message to be published: " + JSON.stringify(text));
      kafka.produce(args.topic, JSON.stringify(text))
          .then(function() {
              resolve({
                  "result": "Success: Message was sent to IBM Message Hub."
              });
          })
          .fail(function(error) {
              reject(error);
          });
  })catch(error => {
          console.log(error);
  });

  });
}

exports.main = mhpost;
