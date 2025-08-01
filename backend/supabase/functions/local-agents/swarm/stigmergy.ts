/**
 * Stigmergic Communication System
 *
 * Enables indirect coordination through environmental modifications,
 * allowing complex collective behaviors without direct communication.
 */

import {
  PheromoneField,
  PheromoneCell,
  PheromoneDeposit,
  PheromoneType,
  Position,
  SearchSpace,
  Pattern,
  Condition,
  Action,
} from './types.ts';

/**
 * Stigmergic Environment
 *
 * Manages environmental traces that enable indirect communication
 */
export class StigmergicEnvironment {
  private fields: Map<string, PheromoneField> = new Map();
  private digitalPheromones: Map<string, DigitalPheromone[]> = new Map();
  private artifacts: Map<string, EnvironmentalArtifact[]> = new Map();
  private templates: Map<string, StigmergicTemplate> = new Map();

  // Configuration
  private evaporationRate: number = 0.1;
  private diffusionRate: number = 0.05;
  private maxIntensity: number = 10.0;
  private gridResolution: number = 20;

  /**
   * Initialize stigmergic field
   */
  initializeField(
    fieldId: string,
    searchSpace: SearchSpace,
    config?: StigmergicConfig,
  ): PheromoneField {
    const resolution = config?.resolution || this.gridResolution;
    const field = this.createPheromoneField(searchSpace, resolution, config);

    this.fields.set(fieldId, field);
    this.digitalPheromones.set(fieldId, []);
    this.artifacts.set(fieldId, []);

    return field;
  }

  /**
   * Deposit pheromone in environment
   */
  depositPheromone(
    fieldId: string,
    deposit: PheromoneDeposit,
  ): void {
    const field = this.fields.get(fieldId);
    if (!field) {return;}

    // Add to spatial field
    this.addToSpatialField(field, deposit);

    // Create digital pheromone for complex information
    if (deposit.metadata && Object.keys(deposit.metadata).length > 0) {
      const digital: DigitalPheromone = {
        ...deposit,
        semantics: this.extractSemantics(deposit),
        decay: this.calculateDecayFunction(deposit.type),
      };

      this.digitalPheromones.get(fieldId)?.push(digital);
    }

    // Trigger template matching
    this.checkTemplateActivation(fieldId, deposit);
  }

  /**
   * Read pheromone gradient at position
   */
  readGradient(
    fieldId: string,
    position: Position,
    type?: PheromoneType,
  ): GradientInfo {
    const field = this.fields.get(fieldId);
    if (!field) {
      return {
        direction: new Array(position.dimensions.length).fill(0),
        strength: 0,
        types: new Map(),
      };
    }

    const cell = this.getCell(field, position);
    const gradient = this.calculateGradient(field, cell, type);

    return gradient;
  }

  /**
   * Create environmental artifact
   */
  createArtifact(
    fieldId: string,
    artifact: EnvironmentalArtifact,
  ): void {
    const artifacts = this.artifacts.get(fieldId);
    if (!artifacts) {return;}

    artifacts.push(artifact);

    // Emit pheromones from artifact
    if (artifact.emitsPheromones) {
      this.emitFromArtifact(fieldId, artifact);
    }

    // Check for emergent structures
    this.detectEmergentStructures(fieldId);
  }

  /**
   * Update stigmergic environment
   */
  update(fieldId: string, deltaTime: number): void {
    const field = this.fields.get(fieldId);
    if (!field) {return;}

    // Evaporate pheromones
    this.evaporatePheromones(field, deltaTime);

    // Diffuse pheromones
    this.diffusePheromones(field, deltaTime);

    // Update digital pheromones
    this.updateDigitalPheromones(fieldId, deltaTime);

    // Update artifacts
    this.updateArtifacts(fieldId, deltaTime);

    // Detect patterns
    this.detectStigmergicPatterns(fieldId);
  }

  /**
   * Query semantic pheromones
   */
  querySemanticPheromones(
    fieldId: string,
    query: SemanticQuery,
  ): DigitalPheromone[] {
    const pheromones = this.digitalPheromones.get(fieldId) || [];

    return pheromones.filter(p => {
      // Check type match
      if (query.type && p.type !== query.type) {return false;}

      // Check semantic match
      if (query.semantics) {
        const similarity = this.calculateSemanticSimilarity(
          p.semantics,
          query.semantics,
        );
        if (similarity < (query.threshold || 0.7)) {return false;}
      }

      // Check spatial proximity
      if (query.position) {
        const distance = this.calculateDistance(p.position, query.position);
        if (distance > (query.radius || 1.0)) {return false;}
      }

      // Check metadata filters
      if (query.filters) {
        for (const [key, value] of Object.entries(query.filters)) {
          if (p.metadata[key] !== value) {return false;}
        }
      }

      return true;
    });
  }

  /**
   * Register stigmergic template
   */
  registerTemplate(template: StigmergicTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Create pheromone field grid
   */
  private createPheromoneField(
    _searchSpace: SearchSpace,
    resolution: number,
    config?: StigmergicConfig,
  ): PheromoneField {
    const grid: PheromoneCell[][][] = [];

    // Create 3D grid
    for (let x = 0; x < resolution; x++) {
      grid[x] = [];
      for (let y = 0; y < resolution; y++) {
        grid[x][y] = [];
        for (let z = 0; z < resolution; z++) {
          const position: Position = {
            dimensions: [
              x / resolution,
              y / resolution,
              z / resolution,
            ],
            confidence: 0,
            timestamp: Date.now(),
          };

          grid[x][y][z] = {
            position,
            deposits: new Map(),
            lastUpdate: Date.now(),
            gradient: [0, 0, 0],
          };
        }
      }
    }

    return {
      grid,
      resolution,
      evaporationRate: config?.evaporationRate || this.evaporationRate,
      diffusionRate: config?.diffusionRate || this.diffusionRate,
      maxIntensity: config?.maxIntensity || this.maxIntensity,
    };
  }

  /**
   * Add pheromone to spatial field
   */
  private addToSpatialField(
    field: PheromoneField,
    deposit: PheromoneDeposit,
  ): void {
    const cell = this.getCell(field, deposit.position);

    // Add or update intensity
    const currentIntensity = cell.deposits.get(deposit.type) || 0;
    const newIntensity = Math.min(
      field.maxIntensity,
      currentIntensity + deposit.strength,
    );

    cell.deposits.set(deposit.type, newIntensity);
    cell.lastUpdate = Date.now();

    // Update gradients in neighborhood
    this.updateNeighborhoodGradients(field, deposit.position);
  }

  /**
   * Get cell from position
   */
  private getCell(field: PheromoneField, position: Position): PheromoneCell {
    const indices = this.positionToIndices(position, field.resolution);
    return field.grid[indices.x][indices.y][indices.z];
  }

  /**
   * Convert position to grid indices
   */
  private positionToIndices(
    position: Position,
    resolution: number,
  ): { x: number; y: number; z: number } {
    const x = Math.floor(Math.max(0, Math.min(0.999, position.dimensions[0])) * resolution);
    const y = Math.floor(Math.max(0, Math.min(0.999, position.dimensions[1] || 0)) * resolution);
    const z = Math.floor(Math.max(0, Math.min(0.999, position.dimensions[2] || 0)) * resolution);

    return { x, y, z };
  }

  /**
   * Calculate gradient at cell
   */
  private calculateGradient(
    field: PheromoneField,
    cell: PheromoneCell,
    type?: PheromoneType,
  ): GradientInfo {
    const indices = this.positionToIndices(cell.position, field.resolution);
    const gradient = [0, 0, 0];
    const types = new Map<PheromoneType, number>();

    // Sample neighbors
    const neighbors = [
      { dx: 1, dy: 0, dz: 0 },
      { dx: -1, dy: 0, dz: 0 },
      { dx: 0, dy: 1, dz: 0 },
      { dx: 0, dy: -1, dz: 0 },
      { dx: 0, dy: 0, dz: 1 },
      { dx: 0, dy: 0, dz: -1 },
    ];

    for (const { dx, dy, dz } of neighbors) {
      const nx = indices.x + dx;
      const ny = indices.y + dy;
      const nz = indices.z + dz;

      if (nx >= 0 && nx < field.resolution &&
          ny >= 0 && ny < field.resolution &&
          nz >= 0 && nz < field.resolution) {

        const neighborCell = field.grid[nx][ny][nz];

        // Calculate intensity difference
        let intensity = 0;
        if (type) {
          intensity = (neighborCell.deposits.get(type) || 0) -
                     (cell.deposits.get(type) || 0);
        } else {
          // Total intensity
          for (const [t, value] of neighborCell.deposits) {
            intensity += value;
            types.set(t, (types.get(t) || 0) + value);
          }
          for (const [, value] of cell.deposits) {
            intensity -= value;
          }
        }

        gradient[0] += dx * intensity;
        gradient[1] += dy * intensity;
        gradient[2] += dz * intensity;
      }
    }

    // Normalize gradient
    const magnitude = Math.sqrt(gradient.reduce((sum, g) => sum + g * g, 0));
    const strength = magnitude;

    if (magnitude > 0) {
      gradient[0] /= magnitude;
      gradient[1] /= magnitude;
      gradient[2] /= magnitude;
    }

    return { direction: gradient, strength, types };
  }

  /**
   * Update gradients in neighborhood
   */
  private updateNeighborhoodGradients(
    field: PheromoneField,
    position: Position,
  ): void {
    const indices = this.positionToIndices(position, field.resolution);
    const radius = 2; // Update radius

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const x = indices.x + dx;
          const y = indices.y + dy;
          const z = indices.z + dz;

          if (x >= 0 && x < field.resolution &&
              y >= 0 && y < field.resolution &&
              z >= 0 && z < field.resolution) {

            const cell = field.grid[x][y][z];
            const gradientInfo = this.calculateGradient(field, cell);
            cell.gradient = gradientInfo.direction;
          }
        }
      }
    }
  }

  /**
   * Evaporate pheromones
   */
  private evaporatePheromones(field: PheromoneField, deltaTime: number): void {
    const evaporationFactor = Math.exp(-field.evaporationRate * deltaTime);

    for (let x = 0; x < field.resolution; x++) {
      for (let y = 0; y < field.resolution; y++) {
        for (let z = 0; z < field.resolution; z++) {
          const cell = field.grid[x][y][z];

          for (const [type, intensity] of cell.deposits) {
            const newIntensity = intensity * evaporationFactor;

            if (newIntensity < 0.01) {
              cell.deposits.delete(type);
            } else {
              cell.deposits.set(type, newIntensity);
            }
          }
        }
      }
    }
  }

  /**
   * Diffuse pheromones
   */
  private diffusePheromones(field: PheromoneField, deltaTime: number): void {
    const diffusionFactor = field.diffusionRate * deltaTime;
    const newDeposits: Map<string, Map<PheromoneType, number>> = new Map();

    // Calculate diffusion
    for (let x = 0; x < field.resolution; x++) {
      for (let y = 0; y < field.resolution; y++) {
        for (let z = 0; z < field.resolution; z++) {
          const cell = field.grid[x][y][z];
          const key = `${x},${y},${z}`;

          if (!newDeposits.has(key)) {
            newDeposits.set(key, new Map());
          }

          // Diffuse to neighbors
          const neighbors = this.getNeighborIndices(x, y, z, field.resolution);
          const diffusionPerNeighbor = diffusionFactor / neighbors.length;

          for (const [type, intensity] of cell.deposits) {
            const diffused = intensity * diffusionFactor;
            const remaining = intensity - diffused;

            // Keep remaining
            const cellDeposits = newDeposits.get(key)!;
            cellDeposits.set(type, (cellDeposits.get(type) || 0) + remaining);

            // Distribute to neighbors
            for (const neighbor of neighbors) {
              const nKey = `${neighbor.x},${neighbor.y},${neighbor.z}`;
              if (!newDeposits.has(nKey)) {
                newDeposits.set(nKey, new Map());
              }

              const nDeposits = newDeposits.get(nKey)!;
              const current = nDeposits.get(type) || 0;
              nDeposits.set(type, current + diffused * diffusionPerNeighbor);
            }
          }
        }
      }
    }

    // Apply diffused values
    for (let x = 0; x < field.resolution; x++) {
      for (let y = 0; y < field.resolution; y++) {
        for (let z = 0; z < field.resolution; z++) {
          const key = `${x},${y},${z}`;
          const deposits = newDeposits.get(key);

          if (deposits) {
            field.grid[x][y][z].deposits = deposits;
          }
        }
      }
    }
  }

  /**
   * Get valid neighbor indices
   */
  private getNeighborIndices(
    x: number,
    y: number,
    z: number,
    resolution: number,
  ): Array<{ x: number; y: number; z: number }> {
    const neighbors: Array<{ x: number; y: number; z: number }> = [];
    const offsets = [
      { dx: 1, dy: 0, dz: 0 },
      { dx: -1, dy: 0, dz: 0 },
      { dx: 0, dy: 1, dz: 0 },
      { dx: 0, dy: -1, dz: 0 },
      { dx: 0, dy: 0, dz: 1 },
      { dx: 0, dy: 0, dz: -1 },
    ];

    for (const { dx, dy, dz } of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;

      if (nx >= 0 && nx < resolution &&
          ny >= 0 && ny < resolution &&
          nz >= 0 && nz < resolution) {
        neighbors.push({ x: nx, y: ny, z: nz });
      }
    }

    return neighbors;
  }

  /**
   * Extract semantic information from pheromone
   */
  private extractSemantics(deposit: PheromoneDeposit): SemanticInfo {
    const semantics: SemanticInfo = {
      category: this.categorizeType(deposit.type),
      valence: this.calculateValence(deposit.type),
      urgency: this.calculateUrgency(deposit),
      context: this.extractContext(deposit.metadata),
      relationships: [],
    };

    // Extract relationships from metadata
    if (deposit.metadata.relatedTo) {
      semantics.relationships.push({
        type: 'related',
        target: deposit.metadata.relatedTo as string,
        strength: 0.8,
      });
    }

    return semantics;
  }

  /**
   * Categorize pheromone type
   */
  private categorizeType(type: PheromoneType): string {
    const categories: Record<PheromoneType, string> = {
      'attraction': 'positive',
      'repulsion': 'negative',
      'trail': 'navigation',
      'alarm': 'warning',
      'food': 'resource',
      'nest': 'home',
      'boundary': 'territorial',
      'convergence': 'coordination',
      'quality': 'evaluation',
    };

    return categories[type] || 'unknown';
  }

  /**
   * Calculate valence (positive/negative)
   */
  private calculateValence(type: PheromoneType): number {
    const valences: Record<PheromoneType, number> = {
      'attraction': 1.0,
      'repulsion': -1.0,
      'trail': 0.5,
      'alarm': -0.8,
      'food': 0.9,
      'nest': 0.7,
      'boundary': 0.0,
      'convergence': 0.6,
      'quality': 0.5,
    };

    return valences[type] || 0;
  }

  /**
   * Calculate urgency from deposit
   */
  private calculateUrgency(deposit: PheromoneDeposit): number {
    let urgency = 0.5;

    // High strength indicates urgency
    urgency += deposit.strength * 0.3;

    // Low evaporation rate indicates importance
    urgency += (1 - deposit.evaporationRate) * 0.2;

    // Alarm type is urgent
    if (deposit.type === 'alarm') {
      urgency = Math.max(urgency, 0.9);
    }

    return Math.min(1, urgency);
  }

  /**
   * Extract context from metadata
   */
  private extractContext(metadata: Record<string, unknown>): string[] {
    const context: string[] = [];

    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        context.push(`${key}:${value}`);
      } else if (typeof value === 'number') {
        context.push(`${key}:${value.toFixed(2)}`);
      }
    }

    return context;
  }

  /**
   * Calculate decay function
   */
  private calculateDecayFunction(type: PheromoneType): (t: number) => number {
    // Different decay functions for different types
    switch (type) {
      case 'alarm':
        // Fast initial decay, then slow
        return (t: number) => Math.exp(-t * 2) * 0.8 + 0.2 * Math.exp(-t * 0.1);

      case 'trail':
        // Linear decay
        return (t: number) => Math.max(0, 1 - t * 0.1);

      case 'food':
      case 'quality':
        // Slow exponential decay
        return (t: number) => Math.exp(-t * 0.05);

      default:
        // Standard exponential decay
        return (t: number) => Math.exp(-t * 0.1);
    }
  }

  /**
   * Update digital pheromones
   */
  private updateDigitalPheromones(fieldId: string, _deltaTime: number): void {
    const pheromones = this.digitalPheromones.get(fieldId);
    if (!pheromones) {return;}

    const active: DigitalPheromone[] = [];
    const now = Date.now();

    for (const pheromone of pheromones) {
      const age = (now - pheromone.timestamp) / 1000; // Convert to seconds
      const strength = pheromone.strength * pheromone.decay(age);

      if (strength > 0.01) {
        pheromone.strength = strength;
        active.push(pheromone);
      }
    }

    this.digitalPheromones.set(fieldId, active);
  }

  /**
   * Emit pheromones from artifact
   */
  private emitFromArtifact(fieldId: string, artifact: EnvironmentalArtifact): void {
    if (!artifact.emitsPheromones) {return;}

    for (const emission of artifact.pheromoneEmissions!) {
      const deposit: PheromoneDeposit = {
        id: `artifact-${artifact.id}-${Date.now()}`,
        type: emission.type,
        position: artifact.position,
        strength: emission.intensity,
        evaporationRate: emission.evaporationRate || this.evaporationRate,
        depositorId: `artifact-${artifact.id}`,
        timestamp: Date.now(),
        metadata: {
          source: 'artifact',
          artifactType: artifact.type,
        },
      };

      this.depositPheromone(fieldId, deposit);
    }
  }

  /**
   * Update artifacts
   */
  private updateArtifacts(fieldId: string, deltaTime: number): void {
    const artifacts = this.artifacts.get(fieldId);
    if (!artifacts) {return;}

    const active: EnvironmentalArtifact[] = [];

    for (const artifact of artifacts) {
      // Update lifetime
      if (artifact.lifetime !== undefined) {
        artifact.lifetime -= deltaTime;

        if (artifact.lifetime <= 0) {
          continue; // Remove expired artifact
        }
      }

      // Update modifications
      if (artifact.modifiesEnvironment) {
        this.applyArtifactModifications(fieldId, artifact);
      }

      active.push(artifact);
    }

    this.artifacts.set(fieldId, active);
  }

  /**
   * Apply artifact environmental modifications
   */
  private applyArtifactModifications(
    fieldId: string,
    artifact: EnvironmentalArtifact,
  ): void {
    const field = this.fields.get(fieldId);
    if (!field || !artifact.modifications) {return;}

    for (const mod of artifact.modifications) {
      switch (mod.type) {
        case 'amplify':
          this.amplifyPheromones(field, artifact.position, mod.radius, mod.factor);
          break;

        case 'suppress':
          this.suppressPheromones(field, artifact.position, mod.radius, mod.factor);
          break;

        case 'redirect':
          this.redirectPheromones(field, artifact.position, mod.radius, mod.direction);
          break;
      }
    }
  }

  /**
   * Amplify pheromones in radius
   */
  private amplifyPheromones(
    field: PheromoneField,
    center: Position,
    radius: number,
    factor: number,
  ): void {
    const centerIndices = this.positionToIndices(center, field.resolution);
    const gridRadius = Math.ceil(radius * field.resolution);

    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      for (let dy = -gridRadius; dy <= gridRadius; dy++) {
        for (let dz = -gridRadius; dz <= gridRadius; dz++) {
          const x = centerIndices.x + dx;
          const y = centerIndices.y + dy;
          const z = centerIndices.z + dz;

          if (x >= 0 && x < field.resolution &&
              y >= 0 && y < field.resolution &&
              z >= 0 && z < field.resolution) {

            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) / field.resolution;

            if (distance <= radius) {
              const cell = field.grid[x][y][z];
              const amplification = 1 + (factor - 1) * (1 - distance / radius);

              for (const [type, intensity] of cell.deposits) {
                cell.deposits.set(type, Math.min(field.maxIntensity, intensity * amplification));
              }
            }
          }
        }
      }
    }
  }

  /**
   * Suppress pheromones in radius
   */
  private suppressPheromones(
    field: PheromoneField,
    center: Position,
    radius: number,
    factor: number,
  ): void {
    this.amplifyPheromones(field, center, radius, 1 / factor);
  }

  /**
   * Redirect pheromone gradients
   */
  private redirectPheromones(
    field: PheromoneField,
    center: Position,
    radius: number,
    direction: number[],
  ): void {
    const centerIndices = this.positionToIndices(center, field.resolution);
    const gridRadius = Math.ceil(radius * field.resolution);

    // Normalize direction
    const magnitude = Math.sqrt(direction.reduce((sum, d) => sum + d * d, 0));
    const normalizedDir = magnitude > 0 ?
      direction.map(d => d / magnitude) :
      [0, 0, 0];

    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      for (let dy = -gridRadius; dy <= gridRadius; dy++) {
        for (let dz = -gridRadius; dz <= gridRadius; dz++) {
          const x = centerIndices.x + dx;
          const y = centerIndices.y + dy;
          const z = centerIndices.z + dz;

          if (x >= 0 && x < field.resolution &&
              y >= 0 && y < field.resolution &&
              z >= 0 && z < field.resolution) {

            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) / field.resolution;

            if (distance <= radius && distance > 0) {
              const cell = field.grid[x][y][z];
              const influence = 1 - distance / radius;

              // Blend original gradient with redirect direction
              cell.gradient[0] = cell.gradient[0] * (1 - influence) + normalizedDir[0] * influence;
              cell.gradient[1] = cell.gradient[1] * (1 - influence) + normalizedDir[1] * influence;
              cell.gradient[2] = cell.gradient[2] * (1 - influence) + normalizedDir[2] * influence;

              // Renormalize
              const mag = Math.sqrt(cell.gradient.reduce((sum, g) => sum + g * g, 0));
              if (mag > 0) {
                cell.gradient = cell.gradient.map(g => g / mag);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Check template activation
   */
  private checkTemplateActivation(fieldId: string, deposit: PheromoneDeposit): void {
    for (const template of this.templates.values()) {
      if (this.matchesTemplate(deposit, template)) {
        this.activateTemplate(fieldId, template, deposit);
      }
    }
  }

  /**
   * Check if deposit matches template
   */
  private matchesTemplate(deposit: PheromoneDeposit, template: StigmergicTemplate): boolean {
    // Check trigger conditions
    for (const condition of template.triggers) {
      if (!this.evaluateCondition(deposit, condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate condition against deposit
   */
  private evaluateCondition(deposit: PheromoneDeposit, condition: Condition): boolean {
    let value: any;

    switch (condition.field) {
      case 'type':
        value = deposit.type;
        break;
      case 'strength':
        value = deposit.strength;
        break;
      case 'depositorId':
        value = deposit.depositorId;
        break;
      default:
        value = deposit.metadata[condition.field];
    }

    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'gt':
        return value > (condition.value as number);
      case 'lt':
        return value < (condition.value as number);
      case 'gte':
        return value >= (condition.value as number);
      case 'lte':
        return value <= (condition.value as number);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value as string);
      default:
        return false;
    }
  }

  /**
   * Activate template
   */
  private activateTemplate(
    fieldId: string,
    template: StigmergicTemplate,
    trigger: PheromoneDeposit,
  ): void {
    // Execute template actions
    for (const action of template.actions) {
      this.executeTemplateAction(fieldId, action, trigger);
    }

    // Create result artifact if specified
    if (template.resultArtifact) {
      const artifact: EnvironmentalArtifact = {
        id: `template-${template.id}-${Date.now()}`,
        type: template.resultArtifact.type,
        position: trigger.position,
        lifetime: template.resultArtifact.lifetime,
        emitsPheromones: template.resultArtifact.emitsPheromones,
        pheromoneEmissions: template.resultArtifact.emissions,
        modifiesEnvironment: false,
      };

      this.createArtifact(fieldId, artifact);
    }
  }

  /**
   * Execute template action
   */
  private executeTemplateAction(
    fieldId: string,
    action: Action,
    trigger: PheromoneDeposit,
  ): void {
    switch (action.type) {
      case 'deposit':
        const deposit: PheromoneDeposit = {
          id: `template-action-${Date.now()}`,
          type: action.parameters.type as PheromoneType,
          position: trigger.position,
          strength: action.parameters.strength as number || trigger.strength,
          evaporationRate: action.parameters.evaporationRate as number || this.evaporationRate,
          depositorId: `template-${action.target}`,
          timestamp: Date.now(),
          metadata: action.parameters.metadata as Record<string, unknown> || {},
        };
        this.depositPheromone(fieldId, deposit);
        break;

      case 'amplify':
        const field = this.fields.get(fieldId);
        if (field) {
          this.amplifyPheromones(
            field,
            trigger.position,
            action.parameters.radius as number || 1,
            action.parameters.factor as number || 2,
          );
        }
        break;

      case 'create-artifact':
        const artifact: EnvironmentalArtifact = {
          id: `action-artifact-${Date.now()}`,
          type: action.parameters.type as string,
          position: trigger.position,
          lifetime: action.parameters.lifetime as number,
          emitsPheromones: false,
          modifiesEnvironment: false,
        };
        this.createArtifact(fieldId, artifact);
        break;
    }
  }

  /**
   * Detect emergent structures
   */
  private detectEmergentStructures(fieldId: string): void {
    const artifacts = this.artifacts.get(fieldId);
    if (!artifacts || artifacts.length < 3) {return;}

    // Look for spatial patterns in artifacts
    const structures = this.findSpatialStructures(artifacts);

    for (const structure of structures) {
      // Create meta-artifact representing structure
      const metaArtifact: EnvironmentalArtifact = {
        id: `structure-${structure.type}-${Date.now()}`,
        type: `emergent-${structure.type}`,
        position: structure.center,
        lifetime: undefined, // Persistent
        emitsPheromones: true,
        pheromoneEmissions: [
          {
            type: 'convergence',
            intensity: structure.strength,
            evaporationRate: 0.05,
          },
        ],
        modifiesEnvironment: true,
        modifications: [
          {
            type: 'amplify',
            radius: structure.radius,
            factor: 1.5,
          },
        ],
      };

      this.createArtifact(fieldId, metaArtifact);
    }
  }

  /**
   * Find spatial structures in artifacts
   */
  private findSpatialStructures(
    artifacts: EnvironmentalArtifact[],
  ): EmergentStructure[] {
    const structures: EmergentStructure[] = [];

    // Check for linear arrangements
    const lines = this.findLinearStructures(artifacts);
    structures.push(...lines);

    // Check for circular arrangements
    const circles = this.findCircularStructures(artifacts);
    structures.push(...circles);

    // Check for clusters
    const clusters = this.findClusterStructures(artifacts);
    structures.push(...clusters);

    return structures;
  }

  /**
   * Find linear structures
   */
  private findLinearStructures(
    artifacts: EnvironmentalArtifact[],
  ): EmergentStructure[] {
    const structures: EmergentStructure[] = [];
    const threshold = 0.1; // Alignment threshold

    // Check each triplet of artifacts
    for (let i = 0; i < artifacts.length - 2; i++) {
      for (let j = i + 1; j < artifacts.length - 1; j++) {
        for (let k = j + 1; k < artifacts.length; k++) {
          const a = artifacts[i].position;
          const b = artifacts[j].position;
          const c = artifacts[k].position;

          // Check collinearity
          const ab = this.vectorFromTo(a, b);
          const ac = this.vectorFromTo(a, c);

          const cross = this.crossProduct(ab, ac);
          const magnitude = Math.sqrt(cross.reduce((sum, x) => sum + x * x, 0));

          if (magnitude < threshold) {
            // Found linear structure
            const center = this.centerOfPositions([a, b, c]);
            const radius = Math.max(
              this.calculateDistance(center, a),
              this.calculateDistance(center, b),
              this.calculateDistance(center, c),
            );

            structures.push({
              type: 'line',
              artifacts: [artifacts[i].id, artifacts[j].id, artifacts[k].id],
              center,
              radius,
              strength: 1 - magnitude / threshold,
            });
          }
        }
      }
    }

    return structures;
  }

  /**
   * Find circular structures
   */
  private findCircularStructures(
    artifacts: EnvironmentalArtifact[],
  ): EmergentStructure[] {
    const structures: EmergentStructure[] = [];
    const minArtifacts = 4;
    const radiusThreshold = 0.2;

    if (artifacts.length < minArtifacts) {return structures;}

    // Try different combinations as potential circles
    for (let i = 0; i < artifacts.length; i++) {
      const center = artifacts[i].position;
      const nearby: EnvironmentalArtifact[] = [];
      const distances: number[] = [];

      // Find artifacts at similar distances
      for (let j = 0; j < artifacts.length; j++) {
        if (i === j) {continue;}

        const distance = this.calculateDistance(center, artifacts[j].position);
        if (distance > 0) {
          nearby.push(artifacts[j]);
          distances.push(distance);
        }
      }

      if (nearby.length >= minArtifacts - 1) {
        // Check if distances are similar
        const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;

        if (Math.sqrt(variance) / avgDistance < radiusThreshold) {
          // Found circular structure
          structures.push({
            type: 'circle',
            artifacts: [artifacts[i].id, ...nearby.map(a => a.id)],
            center,
            radius: avgDistance,
            strength: 1 - Math.sqrt(variance) / (avgDistance * radiusThreshold),
          });
        }
      }
    }

    return structures;
  }

  /**
   * Find cluster structures
   */
  private findClusterStructures(
    artifacts: EnvironmentalArtifact[],
  ): EmergentStructure[] {
    const structures: EmergentStructure[] = [];
    const clusterRadius = 0.3;
    const minClusterSize = 3;

    const clustered = new Set<string>();

    for (const artifact of artifacts) {
      if (clustered.has(artifact.id)) {continue;}

      const cluster: EnvironmentalArtifact[] = [artifact];
      const toCheck = [artifact];

      while (toCheck.length > 0) {
        const current = toCheck.pop()!;

        for (const other of artifacts) {
          if (clustered.has(other.id) || cluster.includes(other)) {continue;}

          const distance = this.calculateDistance(current.position, other.position);
          if (distance < clusterRadius) {
            cluster.push(other);
            toCheck.push(other);
            clustered.add(other.id);
          }
        }
      }

      if (cluster.length >= minClusterSize) {
        const center = this.centerOfPositions(cluster.map(a => a.position));
        const radius = Math.max(...cluster.map(a =>
          this.calculateDistance(center, a.position),
        ));

        structures.push({
          type: 'cluster',
          artifacts: cluster.map(a => a.id),
          center,
          radius,
          strength: cluster.length / artifacts.length,
        });
      }
    }

    return structures;
  }

  /**
   * Detect stigmergic patterns
   */
  private detectStigmergicPatterns(fieldId: string): void {
    const field = this.fields.get(fieldId);
    if (!field) {return;}

    // Detect trails
    const trails = this.detectTrails(field);

    // Detect convergence points
    const convergencePoints = this.detectConvergencePoints(field);

    // Store patterns for agent use
    const _patterns: Pattern[] = [
      ...trails.map(t => ({
        id: `trail-${Date.now()}`,
        description: `Trail from ${t.start} to ${t.end}`,
        frequency: t.strength,
        reliability: t.consistency,
      })),
      ...convergencePoints.map(c => ({
        id: `convergence-${Date.now()}`,
        description: `Convergence at ${c.position}`,
        frequency: c.strength,
        reliability: 0.8,
      })),
    ];

    // Would emit patterns to agents or store for retrieval
  }

  /**
   * Detect pheromone trails
   */
  private detectTrails(field: PheromoneField): Trail[] {
    const trails: Trail[] = [];
    const visited = new Set<string>();
    const minTrailLength = 5;
    const minIntensity = 0.3;

    // Start from high intensity cells
    for (let x = 0; x < field.resolution; x++) {
      for (let y = 0; y < field.resolution; y++) {
        for (let z = 0; z < field.resolution; z++) {
          const key = `${x},${y},${z}`;
          if (visited.has(key)) {continue;}

          const cell = field.grid[x][y][z];
          const trailIntensity = cell.deposits.get('trail') || 0;

          if (trailIntensity > minIntensity) {
            // Follow gradient to trace trail
            const trail = this.traceTrail(field, { x, y, z }, visited);

            if (trail.length >= minTrailLength) {
              trails.push({
                start: field.grid[trail[0].x][trail[0].y][trail[0].z].position,
                end: field.grid[trail[trail.length - 1].x][trail[trail.length - 1].y][trail[trail.length - 1].z].position,
                path: trail.map(idx => field.grid[idx.x][idx.y][idx.z].position),
                strength: trailIntensity,
                consistency: this.calculateTrailConsistency(field, trail),
              });
            }
          }
        }
      }
    }

    return trails;
  }

  /**
   * Trace trail following gradients
   */
  private traceTrail(
    field: PheromoneField,
    start: { x: number; y: number; z: number },
    visited: Set<string>,
  ): Array<{ x: number; y: number; z: number }> {
    const trail: Array<{ x: number; y: number; z: number }> = [start];
    let current = start;

    visited.add(`${current.x},${current.y},${current.z}`);

    while (true) {
      const cell = field.grid[current.x][current.y][current.z];
      const { gradient } = cell;

      // Find next cell following gradient
      let next: { x: number; y: number; z: number } | null = null;
      let maxComponent = 0;

      const directions = [
        { dx: 1, dy: 0, dz: 0, component: gradient[0] },
        { dx: -1, dy: 0, dz: 0, component: -gradient[0] },
        { dx: 0, dy: 1, dz: 0, component: gradient[1] },
        { dx: 0, dy: -1, dz: 0, component: -gradient[1] },
        { dx: 0, dy: 0, dz: 1, component: gradient[2] },
        { dx: 0, dy: 0, dz: -1, component: -gradient[2] },
      ];

      for (const { dx, dy, dz, component } of directions) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const nz = current.z + dz;
        const key = `${nx},${ny},${nz}`;

        if (nx >= 0 && nx < field.resolution &&
            ny >= 0 && ny < field.resolution &&
            nz >= 0 && nz < field.resolution &&
            !visited.has(key) &&
            component > maxComponent) {

          const nextCell = field.grid[nx][ny][nz];
          const trailIntensity = nextCell.deposits.get('trail') || 0;

          if (trailIntensity > 0.1) {
            next = { x: nx, y: ny, z: nz };
            maxComponent = component;
          }
        }
      }

      if (!next || maxComponent < 0.1) {break;}

      current = next;
      trail.push(current);
      visited.add(`${current.x},${current.y},${current.z}`);
    }

    return trail;
  }

  /**
   * Calculate trail consistency
   */
  private calculateTrailConsistency(
    field: PheromoneField,
    trail: Array<{ x: number; y: number; z: number }>,
  ): number {
    if (trail.length < 2) {return 0;}

    let totalIntensity = 0;
    let minIntensity = Infinity;

    for (const idx of trail) {
      const intensity = field.grid[idx.x][idx.y][idx.z].deposits.get('trail') || 0;
      totalIntensity += intensity;
      minIntensity = Math.min(minIntensity, intensity);
    }

    const avgIntensity = totalIntensity / trail.length;
    return minIntensity / avgIntensity; // High consistency if min close to avg
  }

  /**
   * Detect convergence points
   */
  private detectConvergencePoints(field: PheromoneField): ConvergencePoint[] {
    const points: ConvergencePoint[] = [];
    const threshold = 0.5;

    for (let x = 1; x < field.resolution - 1; x++) {
      for (let y = 1; y < field.resolution - 1; y++) {
        for (let z = 1; z < field.resolution - 1; z++) {
          const cell = field.grid[x][y][z];
          const convergenceIntensity = cell.deposits.get('convergence') || 0;

          if (convergenceIntensity > threshold) {
            // Check if local maximum
            let isMaximum = true;

            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                  if (dx === 0 && dy === 0 && dz === 0) {continue;}

                  const neighbor = field.grid[x + dx][y + dy][z + dz];
                  const neighborIntensity = neighbor.deposits.get('convergence') || 0;

                  if (neighborIntensity > convergenceIntensity) {
                    isMaximum = false;
                    break;
                  }
                }
                if (!isMaximum) {break;}
              }
              if (!isMaximum) {break;}
            }

            if (isMaximum) {
              points.push({
                position: cell.position,
                strength: convergenceIntensity,
                contributors: this.countContributors(field, { x, y, z }, 'convergence'),
              });
            }
          }
        }
      }
    }

    return points;
  }

  /**
   * Count contributors to a pheromone concentration
   */
  private countContributors(
    field: PheromoneField,
    center: { x: number; y: number; z: number },
    type: PheromoneType,
  ): number {
    let contributors = 0;
    const radius = 3;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const x = center.x + dx;
          const y = center.y + dy;
          const z = center.z + dz;

          if (x >= 0 && x < field.resolution &&
              y >= 0 && y < field.resolution &&
              z >= 0 && z < field.resolution) {

            const cell = field.grid[x][y][z];
            if ((cell.deposits.get(type) || 0) > 0.1) {
              contributors++;
            }
          }
        }
      }
    }

    return contributors;
  }

  /**
   * Calculate semantic similarity
   */
  private calculateSemanticSimilarity(s1: SemanticInfo, s2: SemanticInfo): number {
    let similarity = 0;
    let factors = 0;

    // Category match
    if (s1.category === s2.category) {
      similarity += 1;
    }
    factors++;

    // Valence similarity
    const valenceDiff = Math.abs(s1.valence - s2.valence);
    similarity += 1 - valenceDiff / 2;
    factors++;

    // Urgency similarity
    const urgencyDiff = Math.abs(s1.urgency - s2.urgency);
    similarity += 1 - urgencyDiff;
    factors++;

    // Context overlap
    const contextOverlap = this.calculateContextOverlap(s1.context, s2.context);
    similarity += contextOverlap;
    factors++;

    return similarity / factors;
  }

  /**
   * Calculate context overlap
   */
  private calculateContextOverlap(c1: string[], c2: string[]): number {
    if (c1.length === 0 || c2.length === 0) {return 0;}

    const set1 = new Set(c1);
    const set2 = new Set(c2);

    let overlap = 0;
    for (const item of set1) {
      if (set2.has(item)) {overlap++;}
    }

    return overlap / Math.max(set1.size, set2.size);
  }

  /**
   * Calculate distance between positions
   */
  private calculateDistance(p1: Position, p2: Position): number {
    let sum = 0;
    const dims = Math.min(p1.dimensions.length, p2.dimensions.length);

    for (let i = 0; i < dims; i++) {
      const diff = p1.dimensions[i] - p2.dimensions[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Calculate vector from position to position
   */
  private vectorFromTo(from: Position, to: Position): number[] {
    const vector: number[] = [];
    const dims = Math.min(from.dimensions.length, to.dimensions.length);

    for (let i = 0; i < dims; i++) {
      vector.push(to.dimensions[i] - from.dimensions[i]);
    }

    return vector;
  }

  /**
   * Calculate cross product (3D)
   */
  private crossProduct(a: number[], b: number[]): number[] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  /**
   * Calculate center of positions
   */
  private centerOfPositions(positions: Position[]): Position {
    if (positions.length === 0) {
      return { dimensions: [0, 0, 0], confidence: 0, timestamp: Date.now() };
    }

    const dims = positions[0].dimensions.length;
    const center = new Array(dims).fill(0);

    for (const pos of positions) {
      for (let i = 0; i < dims; i++) {
        center[i] += pos.dimensions[i];
      }
    }

    for (let i = 0; i < dims; i++) {
      center[i] /= positions.length;
    }

    return {
      dimensions: center,
      confidence: positions.reduce((sum, p) => sum + p.confidence, 0) / positions.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Get stigmergic state for analysis
   */
  getStigmergicState(fieldId: string): StigmergicState | null {
    const field = this.fields.get(fieldId);
    if (!field) {return null;}

    // Calculate field statistics
    let totalIntensity = 0;
    let maxIntensity = 0;
    const typeDistribution = new Map<PheromoneType, number>();

    for (let x = 0; x < field.resolution; x++) {
      for (let y = 0; y < field.resolution; y++) {
        for (let z = 0; z < field.resolution; z++) {
          const cell = field.grid[x][y][z];

          for (const [type, intensity] of cell.deposits) {
            totalIntensity += intensity;
            maxIntensity = Math.max(maxIntensity, intensity);

            const current = typeDistribution.get(type) || 0;
            typeDistribution.set(type, current + intensity);
          }
        }
      }
    }

    const digitalPheromones = this.digitalPheromones.get(fieldId) || [];
    const artifacts = this.artifacts.get(fieldId) || [];

    return {
      fieldId,
      totalIntensity,
      maxIntensity,
      typeDistribution: Object.fromEntries(typeDistribution),
      digitalPheromoneCount: digitalPheromones.length,
      artifactCount: artifacts.length,
      evaporationRate: field.evaporationRate,
      diffusionRate: field.diffusionRate,
    };
  }
}

// Interfaces
interface StigmergicConfig {
  resolution?: number;
  evaporationRate?: number;
  diffusionRate?: number;
  maxIntensity?: number;
}

interface GradientInfo {
  direction: number[];
  strength: number;
  types: Map<PheromoneType, number>;
}

interface DigitalPheromone extends PheromoneDeposit {
  semantics: SemanticInfo;
  decay: (t: number) => number;
}

interface SemanticInfo {
  category: string;
  valence: number;  // -1 to 1
  urgency: number;  // 0 to 1
  context: string[];
  relationships: Array<{
    type: string;
    target: string;
    strength: number;
  }>;
}

interface SemanticQuery {
  type?: PheromoneType;
  semantics?: Partial<SemanticInfo>;
  position?: Position;
  radius?: number;
  filters?: Record<string, unknown>;
  threshold?: number;
}

interface EnvironmentalArtifact {
  id: string;
  type: string;
  position: Position;
  lifetime?: number;
  emitsPheromones: boolean;
  pheromoneEmissions?: Array<{
    type: PheromoneType;
    intensity: number;
    evaporationRate?: number;
  }>;
  modifiesEnvironment: boolean;
  modifications?: Array<{
    type: 'amplify' | 'suppress' | 'redirect';
    radius: number;
    factor?: number;
    direction?: number[];
  }>;
}

interface StigmergicTemplate {
  id: string;
  name: string;
  description: string;
  triggers: Condition[];
  actions: Action[];
  resultArtifact?: {
    type: string;
    lifetime: number;
    emitsPheromones: boolean;
    emissions?: Array<{
      type: PheromoneType;
      intensity: number;
      evaporationRate?: number;
    }>;
  };
}

interface EmergentStructure {
  type: 'line' | 'circle' | 'cluster' | string;
  artifacts: string[];
  center: Position;
  radius: number;
  strength: number;
}

interface Trail {
  start: Position;
  end: Position;
  path: Position[];
  strength: number;
  consistency: number;
}

interface ConvergencePoint {
  position: Position;
  strength: number;
  contributors: number;
}

interface StigmergicState {
  fieldId: string;
  totalIntensity: number;
  maxIntensity: number;
  typeDistribution: Record<string, number>;
  digitalPheromoneCount: number;
  artifactCount: number;
  evaporationRate: number;
  diffusionRate: number;
}

/**
 * Stigmergic agent interface
 */
export interface StigmergicAgent {
  /**
   * Read pheromone environment
   */
  readPheromones(
    environment: StigmergicEnvironment,
    fieldId: string,
    position: Position
  ): PheromoneReading;

  /**
   * Deposit pheromone
   */
  depositPheromone(
    environment: StigmergicEnvironment,
    fieldId: string,
    type: PheromoneType,
    strength: number,
    metadata?: Record<string, unknown>
  ): void;

  /**
   * Follow pheromone gradient
   */
  followGradient(
    gradient: GradientInfo,
    currentVelocity: number[]
  ): number[];

  /**
   * Create environmental artifact
   */
  createArtifact(
    environment: StigmergicEnvironment,
    fieldId: string,
    artifact: EnvironmentalArtifact
  ): void;
}

interface PheromoneReading {
  localIntensities: Map<PheromoneType, number>;
  gradient: GradientInfo;
  nearbyDigital: DigitalPheromone[];
  nearbyArtifacts: EnvironmentalArtifact[];
}

/**
 * Basic stigmergic agent implementation
 */
export class BasicStigmergicAgent implements StigmergicAgent {
  constructor(
    private agentId: string,
    private position: Position,
  ) {}

  readPheromones(
    environment: StigmergicEnvironment,
    fieldId: string,
    position: Position,
  ): PheromoneReading {
    // Read gradient
    const gradient = environment.readGradient(fieldId, position);

    // Query nearby digital pheromones
    const nearbyDigital = environment.querySemanticPheromones(fieldId, {
      position,
      radius: 0.2,
    });

    // Get local intensities (would need environment method)
    const localIntensities = new Map<PheromoneType, number>();

    // Get nearby artifacts (would need environment method)
    const nearbyArtifacts: EnvironmentalArtifact[] = [];

    return {
      localIntensities,
      gradient,
      nearbyDigital,
      nearbyArtifacts,
    };
  }

  depositPheromone(
    environment: StigmergicEnvironment,
    fieldId: string,
    type: PheromoneType,
    strength: number,
    metadata?: Record<string, unknown>,
  ): void {
    const deposit: PheromoneDeposit = {
      id: `${this.agentId}-${Date.now()}`,
      type,
      position: this.position,
      strength,
      evaporationRate: 0.1,
      depositorId: this.agentId,
      timestamp: Date.now(),
      metadata: metadata || {},
    };

    environment.depositPheromone(fieldId, deposit);
  }

  followGradient(
    gradient: GradientInfo,
    currentVelocity: number[],
  ): number[] {
    const followStrength = 0.5;
    const newVelocity: number[] = [];

    for (let i = 0; i < currentVelocity.length; i++) {
      const gradientComponent = gradient.direction[i] || 0;
      newVelocity[i] = currentVelocity[i] * (1 - followStrength) +
                      gradientComponent * gradient.strength * followStrength;
    }

    return newVelocity;
  }

  createArtifact(
    environment: StigmergicEnvironment,
    fieldId: string,
    artifact: EnvironmentalArtifact,
  ): void {
    environment.createArtifact(fieldId, artifact);
  }
}