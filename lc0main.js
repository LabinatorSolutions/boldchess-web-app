/*
 This file is part of Leela Chess Zero.
 Copyright (C) 2018 The LCZero Authors

 Leela Chess is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 Leela Chess is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with Leela Chess.  If not, see <http://www.gnu.org/licenses/>.
 */

function readFile(url) {
    return new Promise(function(resolve, reject) {
        console.info('loading ' + url);
        var req = new XMLHttpRequest();
        req.open('GET', url);
        req.onload = function() {
            if (req.status == 200)
                resolve(req.response);
            else
                reject(Error(req.statusText));
        };
        req.onerror = function(e) {
            reject(Error('Network Error'));
        };
        req.responseType = 'arraybuffer';
        req.send();
    });
}

function readFileCustom(data) {
    return new Promise(function(resolve, reject) {
        if (data.size <= 0) reject(Error('Error reading "' + data.name + '"'));
        var reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function(e) {
            reject(Error(e.message));
        }
        reader.readAsArrayBuffer(data);
    });
}


Network = function() {
    const kNumOutputPolicies = 1858;
    const kInputPlanes = 112;

    function Network() {
        this.backend = tf.getBackend();
        this.log('Tensorflow backend: ' + this.backend);

        // Select a default dataFormat.
        //
        // 'channelsFirst' also known as 'NCHW' should be faster for webgl.
        // 'channelsLast' also known as 'NHWC' should be faster for cpu.

        // As of tensorflowjs 14.1, batchnorm layer does not work with the
        // 'channelsFirst' dataFormat.
        // It looks like 'channelsFirst' is also slightly faster for both backends
        // but our weights and the input tensor are designed for 'channelsFirst'.

        // Our policy for now is:
        // 'webgl' -> 'channelsFirst'
        // 'cpu'   -> 'channelsLast'

        var format = 'channelsFirst';
        if (this.backend == 'cpu') format = 'channelsLast';
        this.setDataFormat(format);
        this.log('Default data format: ' + format);

        this.input_channels = kInputPlanes;
        this.num_output_policy = kNumOutputPolicies;
        // discover the rest
        this.block = 0; // typically 20
        this.channels = 0; // typically 256
        this.num_value_input_planes = 0; // 32
        this.num_policy_input_planes = 0; // 32
        this.num_value_channels = 0; // 128
    }

    Network.prototype = {


        setDataFormat: function(format) {
            this.dataFormat = format;
            this.isChannelsFirst = format == 'channelsFirst';
            this.isChannelsLast = format == 'channelsLast';
        },

        load: function(name, data) {
            var decoder =
                name.match(/^.*\.txt\.gz$/) ? this.decodeText : this.decodeProtobuf;
            return (data == null ? readFile(name) : readFileCustom(data)).then(decoder.bind(this));
        },

        decodeText: function(bytearray) {
            var text = window.pako.inflate(bytearray, { to: 'string' });
            var lines = text.split(/\r\n|\n/);
            var len = lines.length;
            this.log('Network text file has ' + len + ' lines');
            // LINES = 1  + 4 + 8 * BLOCKS + 6 + 8
            // LINES = 19 + 8 * BLOCKS
            if (lines < 19) throw 'Bad network file';
            var index = 0;
            if (lines[index++] != '2') throw 'Bad network file';
            this.blocks = (len - 19) / 8;
            this.log('Network blocks: ' + this.blocks);
            if (len != 19 + 8 * this.blocks) throw 'Bad network file';
            this.data = {};
            this.data.input = this.decodeTextConv(lines, index, 3);
            index += 4; // first conv3x3
            this.filters = this.data.input.biases.length;
            this.log('Network filters: ' + this.filters);
            this.data.tower = new Array(this.blocks);
            for (block = 0; block < this.blocks; block++) {
                var conv1 = this.decodeTextConv(lines, index, 3);
                index += 4;
                var conv2 = this.decodeTextConv(lines, index, 3);
                index += 4;
                this.data.tower[block] = {
                    conv1: conv1,
                    conv2: conv2,
                };
            }

            // Policy head
            var policy_conv1 = this.decodeTextConv(lines, index, 1);
            index += 4;
            this.num_policy_input_planes = policy_conv1.weights.length / this.filters;
            this.log(
                'Network num_policy_input_planes: ' + this.num_policy_input_planes);
            var policy_fc = this.decodeTextFC(lines, index);
            index += 2;
            this.data.policy_head = {
                conv1: policy_conv1,
                fc: policy_fc,
            };

            // Value head
            var value_conv1 = this.decodeTextConv(lines, index, 1);
            index += 4;
            this.num_value_input_planes = value_conv1.weights.length / this.filters;
            this.log(
                'Network num_value_input_planes: ' + this.num_value_input_planes);
            var value_fc1 = this.decodeTextFC(lines, index);
            index += 2;
            this.num_value_channels = value_fc1.biases.length;
            this.log('Network num_value_channels: ' + this.num_value_channels);
            value_fc2 = this.decodeTextFC(lines, index);
            index += 2;
            this.data.value_head = {
                conv1: value_conv1,
                fc1: value_fc1,
                fc2: value_fc2,
            };

            this.build();
        },

        decodeTextConv: function(lines, index, filtersize) {
            var conv = {};
            conv.filtersize = filtersize;
            conv.weights = lines[index++].split(' ');
            conv.biases = lines[index++].split(' ');
            conv.bn_means = lines[index++].split(' ');
            conv.bn_stddivs = lines[index++].split(' ');
            conv.outputs = conv.biases.length;
            conv.inputs =
                conv.weights.length / (filtersize * filtersize * conv.outputs);
            return conv;
        },

        decodeTextFC: function(lines, index) {
            var fc = {};
            fc.weights = lines[index++].split(' ');
            fc.biases = lines[index++].split(' ');
            fc.outputs = fc.biases.length;
            fc.inputs = fc.weights.length / fc.outputs;
            return fc;
        },

        decodeProtobuf: function(arraybuffer) {
            var byteArray = pako.inflate(arraybuffer);
            var proto = `syntax = "proto2";

package pblczero;

message EngineVersion {
  optional uint32 major = 1;
  optional uint32 minor = 2;
  optional uint32 patch = 3;
}

message Weights {
  message Layer {
    optional float min_val = 1;
    optional float max_val = 2;
    optional bytes params = 3;
  }

  message ConvBlock {
    optional Layer weights = 1;
    optional Layer biases = 2;
    optional Layer bn_means = 3;
    optional Layer bn_stddivs = 4;
  }

  message Residual {
    optional ConvBlock conv1 = 1;
    optional ConvBlock conv2 = 2;
  }

  // Input convnet.
  optional ConvBlock input = 1;

  // Residual tower.
  repeated Residual residual = 2;

  // Policy head
  optional ConvBlock policy = 3;
  optional Layer ip_pol_w = 4;
  optional Layer ip_pol_b = 5;

  // Value head
  optional ConvBlock value = 6;
  optional Layer ip1_val_w = 7;
  optional Layer ip1_val_b = 8;
  optional Layer ip2_val_w = 9;
  optional Layer ip2_val_b = 10;
}

message TrainingParams {
  optional uint32 training_steps = 1;
  optional float learning_rate = 2;
  optional float mse_loss = 3;
  optional float policy_loss = 4;
  optional float accuracy = 5;
  optional string lc0_params = 6;
}

message Format {
  enum Encoding {
    UNKNOWN = 0;
    LINEAR16 = 1;
    ZFP = 2;
  }

  optional Encoding weights_encoding = 1;
}

message Net {
  optional fixed32 magic = 1;
  optional string license = 2;
  optional EngineVersion min_version = 3;
  optional Format format = 4;
  optional TrainingParams training_params = 5;
  optional Weights weights = 10;
}`;
            var type = protobuf.parse(proto).root.lookupType('pblczero.Net');
            var net = type.decode(byteArray);
            this.decodeBin(net);
        },

        decodeBin: function(net) {
            var weights = net.weights;
            this.data = {};
            this.data.input = this.decodeBinConv(weights.input, 3);
            this.filters = this.data.input.biases.length;
            var residuals = weights.residual;
            this.blocks = residuals.length;
            this.log('Network blocks: ' + this.blocks);
            this.log('Network filters: ' + this.filters);
            this.data.tower = new Array(this.blocks);
            for (block = 0; block < this.blocks; block++) {
                var residual = residuals[block];
                var conv1 = this.decodeBinConv(residual.conv1, 3);
                var conv2 = this.decodeBinConv(residual.conv2, 3);
                this.data.tower[block] = {
                    conv1: conv1,
                    conv2: conv2,
                };
            }

            // Policy head
            var policy_conv1 = this.decodeBinConv(weights.policy, 1);
            var policy_fc = this.decodeBinFC(weights.ipPolW, weights.ipPolB);

            this.data.policy_head = {
                conv1: policy_conv1,
                fc: policy_fc,
            };

            // Value head
            var value_conv1 = this.decodeBinConv(weights.value, 1);
            value_fc1 = this.decodeBinFC(weights.ip1ValW, weights.ip1ValB);
            value_fc2 = this.decodeBinFC(weights.ip2ValW, weights.ip2ValB);
            this.data.value_head = {
                conv1: value_conv1,
                fc1: value_fc1,
                fc2: value_fc2,
            };

            this.build();
        },

        decodeBinConv: function(convBlock, filtersize) {
            var conv = {};
            conv.filtersize = filtersize;
            conv.weights = this.decodeBinLayer(convBlock.weights);
            conv.biases = this.decodeBinLayer(convBlock.biases);
            conv.bn_means = this.decodeBinLayer(convBlock.bnMeans);
            conv.bn_stddivs = this.decodeBinLayer(convBlock.bnStddivs);
            conv.outputs = conv.biases.length;
            conv.inputs =
                conv.weights.length / (filtersize * filtersize * conv.outputs);
            return conv;
        },

        decodeBinFC: function(weights, biases) {
            var fc = {};
            fc.weights = this.decodeBinLayer(weights);
            fc.biases = this.decodeBinLayer(biases);
            fc.outputs = fc.biases.length;
            fc.inputs = fc.weights.length / fc.outputs;
            return fc;
        },

        decodeBinLayer: function(layer) {
            var alpha = layer.minVal;
            var beta = (layer.maxVal - layer.minVal) / 65535;
            var bytes = layer.params;
            var len = bytes.length / 2;
            var array = new Float32Array(len);
            // We cannot use a Int32Array to decode the data
            // as the buffer may not be word-aligned.
            for (var i = 0; i < len; i++) {
                var word = bytes[2 * i] + 256 * bytes[2 * i + 1];
                array[i] = alpha + beta * word;
            }
            return array;
        },


        loadFCWeights: function(fc) {
            var weights = fc.weights;
            var inputs = fc.inputs;
            var outputs = fc.outputs;
            var biases = fc.biases;
            var size = inputs * outputs;
            var warray = new Float32Array(size);
            var index = 0;
            for (var input = 0; input < inputs; input++) {
                for (var output = 0; output < outputs; output++) {
                    warray[index++] = weights[input + inputs * output];
                }
            }
            var tw = tf.tensor2d(warray, [fc.inputs, fc.outputs]);
            var tb = tf.tensor1d(new Float32Array(biases));
            return [tw, tb];
        },


        createDenseLayer: function(fc, activation) {
            return tf.layers.dense({
                units: fc.outputs,
                weights: this.loadFCWeights(fc),
                activation: activation,
                useBias: true,
            });
        },


        loadConvWeights: function(conv) {
            var weights = conv.weights;
            var inputs = conv.inputs;
            var outputs = conv.outputs;
            var biases = conv.biases;
            var filtersize = conv.filtersize;
            var filterarea = filtersize * filtersize;
            var size = filterarea * inputs * outputs;
            var warray = new Float32Array(size);
            var index = 0;
            for (var filter = 0; filter < filterarea; filter++) {
                for (var input = 0; input < inputs; input++) {
                    for (var output = 0; output < outputs; output++) {
                        warray[index++] =
                            weights[filter + filterarea * (input + inputs * output)];
                    }
                }
            }
            var tw = tf.tensor4d(warray, [filtersize, filtersize, inputs, outputs]);
            var tb = tf.tensor1d(new Float32Array(biases));
            return [tw, tb];
        },

        applyConvolution: function(flow, conv, skip) {
            var conv_layer = tf.layers.conv2d({
                dataFormat: this.dataFormat,
                kernelSize: [conv.filtersize, conv.filtersize],
                weights: this.loadConvWeights(conv),
                padding: 'same',
                filters: conv.outputs,
                useBias: true,
            });

            flow = conv_layer.apply(flow);

            var tm = tf.tensor1d(new Float32Array(conv.bn_means));
            var ts = tf.tensor1d(new Float32Array(conv.bn_stddivs));

            var bn_layer = tf.layers.batchNormalization({
                axis: this.isChannelsFirst ? 1 : -1,
                epsilon: 1e-5,
                scale: false,
                center: false,
                weights: [tm, ts]
            });
            flow = bn_layer.apply(flow);

            if (skip) {
                var add_layer = tf.layers.add();
                flow = add_layer.apply([flow, skip]);
            }

            relu = tf.layers.reLU();
            flow = relu.apply(flow);

            return flow;
        },


        build: function() {
            this.log('Building network...');
            this.log('Network format: ' + this.dataFormat);

            var batchShape = this.isChannelsFirst ? [null, kInputPlanes, 8, 8] : [null, 8, 8, kInputPlanes];

            this.input = tf.input({ batchShape: batchShape });

            var flow = this.input;
            flow = this.applyConvolution(flow, this.data.input);

            for (var block = 0; block < this.blocks; block++) {
                var skip = flow;
                var res = this.data.tower[block];
                flow = this.applyConvolution(flow, res.conv1);
                flow = this.applyConvolution(flow, res.conv2, skip);
            }

            // Policy head
            var policy_head = this.data.policy_head;
            var p_flow = this.applyConvolution(flow, policy_head.conv1);

            if (this.isChannelsLast) {
                layer = tf.layers.permute({ dims: [3, 1, 2] });
                p_flow = layer.apply(p_flow);
            }

            layer = tf.layers.flatten();
            p_flow = layer.apply(p_flow);

            layer = this.createDenseLayer(policy_head.fc);
            p_flow = layer.apply(p_flow);

            // Value head
            var value_head = this.data.value_head;
            var v_flow = this.applyConvolution(flow, value_head.conv1);

            if (this.isChannelsLast) {
                layer = tf.layers.permute({ dims: [3, 1, 2] });
                v_flow = layer.apply(v_flow);
            }

            layer = tf.layers.flatten();
            v_flow = layer.apply(v_flow);

            layer = this.createDenseLayer(value_head.fc1, 'relu');
            v_flow = layer.apply(v_flow);

            layer = this.createDenseLayer(value_head.fc2);
            v_flow = layer.apply(v_flow);

            this.model = tf.model({ inputs: this.input, outputs: [p_flow, v_flow] });
            this.log('Network successfully built!');
        },

        loadTest: function() {
            readFile('test.txt.gz').then(this.decodeTest.bind(this));
        },

        decodeTest: function(bytearray) {
            var text = window.pako.inflate(bytearray, { to: 'string' });
            var lines = text.split(/\r\n|\n/);
            var line1 = lines[0].split(' ');
            var line2 = lines[1].split(' ');
            var line3 = lines[2].split(' ');

            this.test_x =
                tf.tensor4d(new Float32Array(line1), [1, kInputPlanes, 8, 8]);

            if (this.isChannelsLast) {
                this.test_x = tf.transpose(this.test_x, [0, 2, 3, 1]);
            }

            this.test_y = line2[0];
            this.test_z = tf.tensor1d(new Float32Array(line3));
            this.log('Loaded test data!');


            var predict = this.model.predict(this.test_x);
            //      this.log('input: '+this.test_x);
            this.log('p: ' + predict[0]);
            this.log('v: ' + predict[1]);
        },

        forward: function(batch_size, input, policy, value) {
            var self = this;

            function work() {
                var x = tf.tensor4d(input, [batch_size, kInputPlanes, 8, 8]);
                if (self.isChannelsLast) {
                    x = tf.transpose(x, [0, 2, 3, 1]);
                }

                var predict = self.model.predict(x);
                var p_data = predict[0].dataSync();
                for (var i = 0; i < policy.length; i++) policy[i] = p_data[i];
                var v_data = predict[1].dataSync();
                for (var i = 0; i < value.length; i++) value[i] = v_data[i];
            };
            tf.tidy(work);
        },

        log: function(text) {
            self.console.info(text);
        }

    };

    return Network;
}();


var network = null;

function load_network(filename, data, repaintfunc) {
    network = new Network();
    network.load(filename, data).then(repaintfunc).catch(function(e) { alert(e);
        network = null;
        repaintfunc(); });
}

function lczero_forward(input) {
    if (network == null) return null;
    var input_array = new Float32Array(112 * 64);
    var policy_array = new Float32Array(1858);
    var value_array = new Float32Array(1);
    for (var i = 0; i < input_array.length; i++) input_array[i] = i < input.length ? input[i] : 0;
    /*if (document.getElementById("divEncodedPosition") != null) {
      alert(input_array.length);
      document.getElementById("divEncodedPosition").innerHTML = JSON.stringify(input_array);
    }*/
    network.forward(1, input_array, policy_array, value_array);
    return [policy_array, value_array[0]];
}