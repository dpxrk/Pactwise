import {
  QuantumNeuralNetwork,
  QuantumLayer,
  QuantumState,
  Complex,
  QuantumGate,
  EncodingScheme,
  DecodingScheme,
  QuantumActivation,
  Tensor,
  TensorNetwork,
  ContractionStep,
} from './types.ts';

export class QuantumNeuralNetworkEngine {
  private network: QuantumNeuralNetwork;
  private learningRate: number;
  private readonly BOND_DIMENSION = 64; // Maximum tensor dimension for efficiency

  constructor(
    inputDim: number,
    hiddenDims: number[],
    outputDim: number,
    learningRate: number = 0.01,
  ) {
    this.learningRate = learningRate;
    this.network = this.buildNetwork(inputDim, hiddenDims, outputDim);
    this.tensorNetwork = this.initializeTensorNetwork();
  }

  // Build quantum neural network architecture
  private buildNetwork(
    inputDim: number,
    hiddenDims: number[],
    outputDim: number,
  ): QuantumNeuralNetwork {
    const layers: QuantumLayer[] = [];
    let currentDim = inputDim;

    // Input encoding layer
    layers.push(this.createEncodingLayer(inputDim));

    // Hidden layers with entanglement
    for (const hiddenDim of hiddenDims) {
      layers.push(this.createVariationalLayer(currentDim, hiddenDim));
      layers.push(this.createEntanglingLayer(hiddenDim));
      currentDim = hiddenDim;
    }

    // Output layer
    layers.push(this.createOutputLayer(currentDim, outputDim));

    return {
      layers,
      inputEncoding: this.createAngleEncoding(),
      outputDecoding: this.createExpectationDecoding(),
      lossFunction: this.meanSquaredError.bind(this),
    };
  }

  // Create different types of quantum layers
  private createEncodingLayer(qubits: number): QuantumLayer {
    const gates: QuantumGate[] = [];
    const parameters: number[] = [];

    // RY rotation gates for angle encoding
    for (let i = 0; i < qubits; i++) {
      gates.push({
        name: `RY_${i}`,
        matrix: this.rotationYMatrix(0), // Will be parameterized
        qubits: 1,
        parameters: [0],
      });
      parameters.push(0);
    }

    return {
      type: 'variational',
      qubits,
      gates,
      parameters,
      activation: this.quantumReLU(),
    };
  }

  private createVariationalLayer(inputQubits: number, outputQubits: number): QuantumLayer {
    const qubits = Math.max(inputQubits, outputQubits);
    const gates: QuantumGate[] = [];
    const parameters: number[] = [];

    // Layer of parameterized rotations
    for (let i = 0; i < qubits; i++) {
      // RX gate
      gates.push({
        name: `RX_${i}`,
        matrix: this.rotationXMatrix(0),
        qubits: 1,
        parameters: [0],
      });
      parameters.push(Math.random() * 2 * Math.PI);

      // RZ gate
      gates.push({
        name: `RZ_${i}`,
        matrix: this.rotationZMatrix(0),
        qubits: 1,
        parameters: [0],
      });
      parameters.push(Math.random() * 2 * Math.PI);
    }

    return {
      type: 'variational',
      qubits,
      gates,
      parameters,
      activation: this.quantumSigmoid(),
    };
  }

  private createEntanglingLayer(qubits: number): QuantumLayer {
    const gates: QuantumGate[] = [];

    // Create entangling gates (CNOT ladder)
    for (let i = 0; i < qubits - 1; i++) {
      gates.push({
        name: `CNOT_${i}_${i + 1}`,
        matrix: this.cnotMatrix(),
        qubits: 2,
      });
    }

    // Add a wrapping CNOT for full entanglement
    if (qubits > 2) {
      gates.push({
        name: `CNOT_${qubits - 1}_0`,
        matrix: this.cnotMatrix(),
        qubits: 2,
      });
    }

    return {
      type: 'entangling',
      qubits,
      gates,
      parameters: [],
    };
  }

  private createOutputLayer(inputQubits: number, outputDim: number): QuantumLayer {
    const gates: QuantumGate[] = [];
    const parameters: number[] = [];

    // Final rotation layer before measurement
    for (let i = 0; i < Math.min(inputQubits, outputDim); i++) {
      gates.push({
        name: `RY_out_${i}`,
        matrix: this.rotationYMatrix(0),
        qubits: 1,
        parameters: [0],
      });
      parameters.push(Math.random() * 2 * Math.PI);
    }

    return {
      type: 'variational',
      qubits: inputQubits,
      gates,
      parameters,
    };
  }

  // Quantum gate matrices
  private rotationXMatrix(theta: number): Complex[][] {
    const cos = Math.cos(theta / 2);
    const sin = Math.sin(theta / 2);
    return [
      [{ real: cos, imaginary: 0 }, { real: 0, imaginary: -sin }],
      [{ real: 0, imaginary: -sin }, { real: cos, imaginary: 0 }],
    ];
  }

  private rotationYMatrix(theta: number): Complex[][] {
    const cos = Math.cos(theta / 2);
    const sin = Math.sin(theta / 2);
    return [
      [{ real: cos, imaginary: 0 }, { real: -sin, imaginary: 0 }],
      [{ real: sin, imaginary: 0 }, { real: cos, imaginary: 0 }],
    ];
  }

  private rotationZMatrix(phi: number): Complex[][] {
    return [
      [{ real: Math.cos(phi / 2), imaginary: -Math.sin(phi / 2) }, { real: 0, imaginary: 0 }],
      [{ real: 0, imaginary: 0 }, { real: Math.cos(phi / 2), imaginary: Math.sin(phi / 2) }],
    ];
  }

  private cnotMatrix(): Complex[][] {
    return [
      [{ real: 1, imaginary: 0 }, { real: 0, imaginary: 0 }, { real: 0, imaginary: 0 }, { real: 0, imaginary: 0 }],
      [{ real: 0, imaginary: 0 }, { real: 1, imaginary: 0 }, { real: 0, imaginary: 0 }, { real: 0, imaginary: 0 }],
      [{ real: 0, imaginary: 0 }, { real: 0, imaginary: 0 }, { real: 0, imaginary: 0 }, { real: 1, imaginary: 0 }],
      [{ real: 0, imaginary: 0 }, { real: 0, imaginary: 0 }, { real: 1, imaginary: 0 }, { real: 0, imaginary: 0 }],
    ];
  }

  // Encoding schemes
  private createAngleEncoding(): EncodingScheme {
    return {
      type: 'angle',
      encode: (classical: number[]) => {
        // Normalize input to [0, π]
        const normalized = classical.map(x => {
          const norm = (x - Math.min(...classical)) /
                       (Math.max(...classical) - Math.min(...classical) + 1e-8);
          return norm * Math.PI;
        });

        // Create quantum state with angle encoding
        const qubits = Math.ceil(Math.log2(classical.length));
        const dimension = Math.pow(2, qubits);
        const amplitudes: Complex[] = [];

        for (let i = 0; i < dimension; i++) {
          if (i < normalized.length) {
            const angle = normalized[i];
            amplitudes.push({
              real: Math.cos(angle / 2),
              imaginary: Math.sin(angle / 2),
              magnitude: 1,
              phase: angle / 2,
            });
          } else {
            amplitudes.push({ real: 0, imaginary: 0, magnitude: 0, phase: 0 });
          }
        }

        // Normalize
        this.normalizeState(amplitudes);

        return {
          amplitudes,
          basis: this.generateBasisStates(qubits),
          dimension,
          entanglements: [],
        };
      },
    };
  }

  // Decoding schemes
  private createExpectationDecoding(): DecodingScheme {
    return {
      type: 'expectation',
      decode: (quantum: QuantumState) => {
        // Compute expectation values for each qubit
        const numQubits = Math.log2(quantum.dimension);
        const expectations: number[] = [];

        for (let qubit = 0; qubit < numQubits; qubit++) {
          const expectation = this.computeQubitExpectation(quantum, qubit);
          expectations.push(expectation);
        }

        return expectations;
      },
    };
  }

  // Quantum activation functions
  private quantumReLU(): QuantumActivation {
    return {
      name: 'QuantumReLU',
      apply: (state: QuantumState) => {
        const newAmplitudes = state.amplitudes.map(amp => {
          // Keep only positive real parts
          const real = Math.max(0, amp.real);
          const imaginary = amp.real > 0 ? amp.imaginary : 0;
          return { real, imaginary, magnitude: Math.sqrt(real * real + imaginary * imaginary), phase: Math.atan2(imaginary, real) };
        });

        this.normalizeState(newAmplitudes);
        return { ...state, amplitudes: newAmplitudes };
      },
      derivative: (state: QuantumState) => {
        const newAmplitudes = state.amplitudes.map(amp => {
          const derivative = amp.real > 0 ? 1 : 0;
          return { real: derivative, imaginary: 0, magnitude: derivative, phase: 0 };
        });
        return { ...state, amplitudes: newAmplitudes };
      },
    };
  }

  private quantumSigmoid(): QuantumActivation {
    return {
      name: 'QuantumSigmoid',
      apply: (state: QuantumState) => {
        const newAmplitudes = state.amplitudes.map(amp => {
          // Apply sigmoid-like transformation
          const magnitude = amp.magnitude || 0;
          const sigmoidMag = 1 / (1 + Math.exp(-4 * (magnitude - 0.5)));
          const scale = sigmoidMag / (magnitude + 1e-8);

          return {
            real: amp.real * scale,
            imaginary: amp.imaginary * scale,
            magnitude: sigmoidMag,
            phase: amp.phase || 0,
          };
        });

        this.normalizeState(newAmplitudes);
        return { ...state, amplitudes: newAmplitudes };
      },
    };
  }

  // Forward pass through the network
  async forward(input: number[]): Promise<number[]> {
    // Encode classical input to quantum state
    let state = this.network.inputEncoding.encode(input);

    // Pass through each layer
    for (const layer of this.network.layers) {
      state = await this.applyLayer(state, layer);
    }

    // Decode quantum state to classical output
    return this.network.outputDecoding.decode(state);
  }

  // Apply a single layer to quantum state
  private async applyLayer(state: QuantumState, layer: QuantumLayer): Promise<QuantumState> {
    let newState = { ...state };

    // Apply gates in the layer
    let paramIndex = 0;
    for (const gate of layer.gates) {
      const params = gate.parameters ?
        layer.parameters.slice(paramIndex, paramIndex + gate.parameters.length) :
        undefined;

      newState = this.applyGate(newState, gate, params);

      if (gate.parameters) {
        paramIndex += gate.parameters.length;
      }
    }

    // Apply activation if present
    if (layer.activation) {
      newState = layer.activation.apply(newState);
    }

    return newState;
  }

  // Apply quantum gate to state
  private applyGate(
    state: QuantumState,
    gate: QuantumGate,
    parameters?: number[],
  ): QuantumState {
    // Update gate matrix with parameters if needed
    let { matrix } = gate;
    if (parameters && gate.name.startsWith('RX')) {
      matrix = this.rotationXMatrix(parameters[0]);
    } else if (parameters && gate.name.startsWith('RY')) {
      matrix = this.rotationYMatrix(parameters[0]);
    } else if (parameters && gate.name.startsWith('RZ')) {
      matrix = this.rotationZMatrix(parameters[0]);
    }

    // Apply gate based on number of qubits
    if (gate.qubits === 1) {
      return this.applySingleQubitGate(state, matrix, this.extractQubitIndex(gate.name));
    } else if (gate.qubits === 2) {
      const [control, target] = this.extractQubitIndices(gate.name);
      return this.applyTwoQubitGate(state, matrix, control, target);
    }

    return state;
  }

  // Training methods
  async train(
    inputs: number[][],
    targets: number[][],
    epochs: number,
    batchSize: number = 32,
  ): Promise<{ loss: number[], accuracy: number[] }> {
    const lossHistory: number[] = [];
    const accuracyHistory: number[] = [];

    for (let epoch = 0; epoch < epochs; epoch++) {
      let epochLoss = 0;
      let correct = 0;

      // Shuffle data
      const indices = this.shuffle(Array.from({ length: inputs.length }, (_, i) => i));

      // Process batches
      for (let i = 0; i < inputs.length; i += batchSize) {
        const batchIndices = indices.slice(i, i + batchSize);
        const batchInputs = batchIndices.map(idx => inputs[idx]);
        const batchTargets = batchIndices.map(idx => targets[idx]);

        // Forward pass
        const predictions = await Promise.all(
          batchInputs.map(input => this.forward(input)),
        );

        // Compute loss
        const batchLoss = this.computeBatchLoss(predictions, batchTargets);
        epochLoss += batchLoss * batchIndices.length;

        // Compute accuracy
        correct += this.computeCorrectPredictions(predictions, batchTargets);

        // Backward pass
        await this.backward(batchInputs, predictions, batchTargets);
      }

      // Record metrics
      const avgLoss = epochLoss / inputs.length;
      const accuracy = correct / inputs.length;
      lossHistory.push(avgLoss);
      accuracyHistory.push(accuracy);

      // Learning rate decay
      if (epoch % 50 === 0 && epoch > 0) {
        this.learningRate *= 0.9;
      }
    }

    return { loss: lossHistory, accuracy: accuracyHistory };
  }

  // Backward pass - parameter shift rule for quantum gradients
  private async backward(
    inputs: number[][],
    predictions: number[][],
    targets: number[][],
  ): Promise<void> {
    // Compute gradients for each parameter
    const gradients: number[] = [];

    for (let layerIdx = 0; layerIdx < this.network.layers.length; layerIdx++) {
      const layer = this.network.layers[layerIdx];

      for (let paramIdx = 0; paramIdx < layer.parameters.length; paramIdx++) {
        const gradient = await this.computeParameterGradient(
          inputs,
          predictions,
          targets,
          layerIdx,
          paramIdx,
        );
        gradients.push(gradient);
      }
    }

    // Update parameters
    let gradIdx = 0;
    for (const layer of this.network.layers) {
      for (let i = 0; i < layer.parameters.length; i++) {
        layer.parameters[i] -= this.learningRate * gradients[gradIdx++];
        // Keep parameters in [0, 2π]
        layer.parameters[i] = layer.parameters[i] % (2 * Math.PI);
      }
    }
  }

  // Compute gradient using parameter shift rule
  private async computeParameterGradient(
    inputs: number[][],
    _predictions: number[][],
    targets: number[][],
    layerIdx: number,
    paramIdx: number,
  ): Promise<number> {
    const shift = Math.PI / 2;
    const layer = this.network.layers[layerIdx];
    const originalParam = layer.parameters[paramIdx];

    // Forward pass with parameter + shift
    layer.parameters[paramIdx] = originalParam + shift;
    const predictionsPlus = await Promise.all(
      inputs.map(input => this.forward(input)),
    );
    const lossPlus = this.computeBatchLoss(predictionsPlus, targets);

    // Forward pass with parameter - shift
    layer.parameters[paramIdx] = originalParam - shift;
    const predictionsMinus = await Promise.all(
      inputs.map(input => this.forward(input)),
    );
    const lossMinus = this.computeBatchLoss(predictionsMinus, targets);

    // Restore original parameter
    layer.parameters[paramIdx] = originalParam;

    // Parameter shift rule gradient
    return (lossPlus - lossMinus) / 2;
  }

  // Tensor network methods for efficient simulation
  private initializeTensorNetwork(): TensorNetwork {
    const tensors = new Map<string, Tensor>();
    const contractionOrder: ContractionStep[] = [];

    // Create tensor for each layer
    for (let i = 0; i < this.network.layers.length; i++) {
      const layer = this.network.layers[i];
      const tensor = this.layerToTensor(layer, i);
      tensors.set(`layer_${i}`, tensor);
    }

    // Define contraction order (sequential for now)
    for (let i = 0; i < this.network.layers.length - 1; i++) {
      contractionOrder.push({
        tensor1: `layer_${i}`,
        tensor2: `layer_${i + 1}`,
        contractedIndices: [`out_${i}`],
        resultTensor: `intermediate_${i}`,
      });
    }

    return {
      tensors,
      contractionOrder,
      bondDimension: this.BOND_DIMENSION,
    };
  }

  private layerToTensor(layer: QuantumLayer, layerIdx: number): Tensor {
    const inputDim = layer.qubits;
    const outputDim = layer.qubits;
    const data: Complex[] = [];

    // Compute layer tensor elements
    for (let i = 0; i < Math.pow(2, inputDim); i++) {
      for (let j = 0; j < Math.pow(2, outputDim); j++) {
        const element = this.computeLayerMatrixElement(layer, i, j);
        data.push(element);
      }
    }

    return {
      id: `layer_${layerIdx}`,
      data,
      shape: [Math.pow(2, inputDim), Math.pow(2, outputDim)],
      indices: [
        { name: `in_${layerIdx}`, dimension: Math.pow(2, inputDim), type: 'physical' },
        { name: `out_${layerIdx}`, dimension: Math.pow(2, outputDim), type: 'physical' },
      ],
    };
  }

  private computeLayerMatrixElement(_layer: QuantumLayer, i: number, j: number): Complex {
    // Simplified - compute <j|U|i> where U is the layer unitary
    if (i === j) {
      return { real: 1, imaginary: 0, magnitude: 1, phase: 0 };
    }
    return { real: 0, imaginary: 0, magnitude: 0, phase: 0 };
  }

  // Utility methods
  private normalizeState(amplitudes: Complex[]): void {
    const norm = Math.sqrt(
      amplitudes.reduce((sum, amp) =>
        sum + amp.real * amp.real + amp.imaginary * amp.imaginary, 0,
      ),
    );

    if (norm > 1e-8) {
      for (const amp of amplitudes) {
        amp.real /= norm;
        amp.imaginary /= norm;
        amp.magnitude = Math.sqrt(amp.real * amp.real + amp.imaginary * amp.imaginary);
        amp.phase = Math.atan2(amp.imaginary, amp.real);
      }
    }
  }

  private generateBasisStates(n: number): string[] {
    const states: string[] = [];
    const total = Math.pow(2, n);

    for (let i = 0; i < total; i++) {
      states.push(i.toString(2).padStart(n, '0'));
    }

    return states;
  }

  private computeQubitExpectation(state: QuantumState, qubit: number): number {
    let expectation = 0;

    for (let i = 0; i < state.amplitudes.length; i++) {
      const bitstring = state.basis[i];
      const bit = parseInt(bitstring[qubit]);
      const probability = state.amplitudes[i].real ** 2 + state.amplitudes[i].imaginary ** 2;

      expectation += (bit === 0 ? 1 : -1) * probability;
    }

    return expectation;
  }

  private extractQubitIndex(gateName: string): number {
    const match = gateName.match(/_(\d+)$/);
    return match ? parseInt(match[1]) : 0;
  }

  private extractQubitIndices(gateName: string): [number, number] {
    const match = gateName.match(/_(\d+)_(\d+)$/);
    return match ? [parseInt(match[1]), parseInt(match[2])] : [0, 1];
  }

  private applySingleQubitGate(
    state: QuantumState,
    matrix: Complex[][],
    qubitIndex: number,
  ): QuantumState {
    const newAmplitudes = [...state.amplitudes];
    const numQubits = Math.log2(state.dimension);

    // Apply gate to each computational basis state
    for (let i = 0; i < state.dimension; i++) {
      const bitstring = i.toString(2).padStart(numQubits, '0');
      const qubitValue = parseInt(bitstring[qubitIndex]);

      // Find the complementary state (flip the qubit)
      const flippedBitstring = bitstring.substring(0, qubitIndex) +
                              (1 - qubitValue) +
                              bitstring.substring(qubitIndex + 1);
      const j = parseInt(flippedBitstring, 2);

      // Apply 2x2 gate matrix
      const amp0 = newAmplitudes[qubitValue === 0 ? i : j];
      const amp1 = newAmplitudes[qubitValue === 1 ? i : j];

      newAmplitudes[i] = this.addComplex(
        this.multiplyComplex(matrix[qubitValue][0], amp0),
        this.multiplyComplex(matrix[qubitValue][1], amp1),
      );
    }

    return { ...state, amplitudes: newAmplitudes };
  }

  private applyTwoQubitGate(
    state: QuantumState,
    _matrix: Complex[][],
    control: number,
    target: number,
  ): QuantumState {
    const newAmplitudes = [...state.amplitudes];
    const numQubits = Math.log2(state.dimension);

    // Apply CNOT gate
    for (let i = 0; i < state.dimension; i++) {
      const bitstring = i.toString(2).padStart(numQubits, '0');
      const controlBit = parseInt(bitstring[control]);
      const targetBit = parseInt(bitstring[target]);

      if (controlBit === 1) {
        // Flip target bit
        const flippedBitstring = bitstring.substring(0, target) +
                                (1 - targetBit) +
                                bitstring.substring(target + 1);
        const j = parseInt(flippedBitstring, 2);

        // Swap amplitudes
        const temp = newAmplitudes[i];
        newAmplitudes[i] = newAmplitudes[j];
        newAmplitudes[j] = temp;
      }
    }

    return { ...state, amplitudes: newAmplitudes };
  }

  private multiplyComplex(a: Complex, b: Complex): Complex {
    return {
      real: a.real * b.real - a.imaginary * b.imaginary,
      imaginary: a.real * b.imaginary + a.imaginary * b.real,
      magnitude: (a.magnitude || 0) * (b.magnitude || 0),
      phase: (a.phase || 0) + (b.phase || 0),
    };
  }

  private addComplex(a: Complex, b: Complex): Complex {
    const real = a.real + b.real;
    const imaginary = a.imaginary + b.imaginary;
    return {
      real,
      imaginary,
      magnitude: Math.sqrt(real * real + imaginary * imaginary),
      phase: Math.atan2(imaginary, real),
    };
  }

  private meanSquaredError(predicted: number[], actual: number[]): number {
    let sum = 0;
    for (let i = 0; i < predicted.length; i++) {
      const diff = predicted[i] - actual[i];
      sum += diff * diff;
    }
    return sum / predicted.length;
  }

  private computeBatchLoss(predictions: number[][], targets: number[][]): number {
    let totalLoss = 0;
    for (let i = 0; i < predictions.length; i++) {
      totalLoss += this.network.lossFunction(predictions[i], targets[i]);
    }
    return totalLoss / predictions.length;
  }

  private computeCorrectPredictions(predictions: number[][], targets: number[][]): number {
    let correct = 0;
    for (let i = 0; i < predictions.length; i++) {
      const predClass = predictions[i].indexOf(Math.max(...predictions[i]));
      const targetClass = targets[i].indexOf(Math.max(...targets[i]));
      if (predClass === targetClass) {correct++;}
    }
    return correct;
  }

  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Public methods for model management
  getParameters(): number[] {
    const params: number[] = [];
    for (const layer of this.network.layers) {
      params.push(...layer.parameters);
    }
    return params;
  }

  setParameters(params: number[]): void {
    let idx = 0;
    for (const layer of this.network.layers) {
      for (let i = 0; i < layer.parameters.length; i++) {
        layer.parameters[i] = params[idx++];
      }
    }
  }

  // Quantum advantage estimation
  estimateQuantumAdvantage(classicalParams: number): number {
    // Estimate speedup based on entanglement and superposition
    const entanglementLayers = this.network.layers.filter(l => l.type === 'entangling').length;
    const totalQubits = Math.max(...this.network.layers.map(l => l.qubits));

    // Theoretical speedup from quantum parallelism
    const superpositionAdvantage = Math.sqrt(Math.pow(2, totalQubits));
    const entanglementAdvantage = Math.pow(1.5, entanglementLayers);

    return Math.min(superpositionAdvantage * entanglementAdvantage / classicalParams, 100);
  }
}