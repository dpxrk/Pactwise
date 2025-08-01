-- Swarm Intelligence System Tables
-- Revolutionary collective intelligence infrastructure for distributed problem-solving

-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS maintain_swarm_updated_at ON swarms CASCADE;
DROP TRIGGER IF EXISTS maintain_swarm_agent_updated_at ON swarm_agents CASCADE;
DROP TRIGGER IF EXISTS maintain_pheromone_field_updated_at ON pheromone_fields CASCADE;
DROP TRIGGER IF EXISTS maintain_swarm_consensus_updated_at ON swarm_consensus CASCADE;
DROP TRIGGER IF EXISTS maintain_emergent_patterns_updated_at ON emergent_patterns CASCADE;

DROP TABLE IF EXISTS swarm_metrics CASCADE;
DROP TABLE IF EXISTS distributed_solutions CASCADE;
DROP TABLE IF EXISTS swarm_consensus CASCADE;
DROP TABLE IF EXISTS emergent_patterns CASCADE;
DROP TABLE IF EXISTS pheromone_deposits CASCADE;
DROP TABLE IF EXISTS pheromone_fields CASCADE;
DROP TABLE IF EXISTS swarm_messages CASCADE;
DROP TABLE IF EXISTS swarm_agents CASCADE;
DROP TABLE IF EXISTS swarms CASCADE;

-- Swarms table - collective intelligence instances
CREATE TABLE swarms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    problem_type TEXT NOT NULL CHECK (problem_type IN (
        'optimization', 'exploration', 'classification', 'prediction',
        'construction', 'pathfinding', 'clustering', 'consensus', 'adaptation'
    )),
    algorithm_type TEXT NOT NULL CHECK (algorithm_type IN (
        'pso', 'aco', 'abc', 'firefly', 'cuckoo', 'wolf', 
        'whale', 'dragonfly', 'grasshopper', 'hybrid'
    )),
    status TEXT NOT NULL DEFAULT 'initializing' CHECK (status IN (
        'initializing', 'active', 'converging', 'completed', 'failed'
    )),
    phase TEXT NOT NULL DEFAULT 'initialization' CHECK (phase IN (
        'initialization', 'exploration', 'exploitation', 'convergence',
        'stagnation', 'divergence', 'reorganization', 'termination'
    )),
    config JSONB NOT NULL DEFAULT '{}',
    problem_definition JSONB NOT NULL,
    state JSONB NOT NULL DEFAULT '{}',
    performance_metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT swarms_name_enterprise_unique UNIQUE (enterprise_id, name)
);

-- Swarm agents table - individual agents in swarm
CREATE TABLE swarm_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swarm_id UUID NOT NULL REFERENCES swarms(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    agent_type TEXT NOT NULL CHECK (agent_type IN (
        'explorer', 'worker', 'scout', 'coordinator', 'aggregator',
        'sentinel', 'messenger', 'architect', 'harvester', 'innovator'
    )),
    position JSONB NOT NULL DEFAULT '{"dimensions": [0,0,0], "confidence": 0.5}',
    velocity JSONB NOT NULL DEFAULT '{"components": [0,0,0], "magnitude": 0}',
    fitness REAL NOT NULL DEFAULT 0 CHECK (fitness >= 0 AND fitness <= 1),
    state JSONB NOT NULL DEFAULT '{}',
    memory JSONB NOT NULL DEFAULT '{}',
    neighbors TEXT[] NOT NULL DEFAULT '{}',
    role JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT swarm_agents_unique UNIQUE (swarm_id, agent_id)
);

-- Pheromone fields table - stigmergic environment
CREATE TABLE pheromone_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swarm_id UUID NOT NULL REFERENCES swarms(id) ON DELETE CASCADE,
    field_data JSONB NOT NULL DEFAULT '{}', -- Compressed field representation
    resolution INTEGER NOT NULL DEFAULT 20,
    evaporation_rate REAL NOT NULL DEFAULT 0.1 CHECK (evaporation_rate >= 0 AND evaporation_rate <= 1),
    diffusion_rate REAL NOT NULL DEFAULT 0.05 CHECK (diffusion_rate >= 0 AND diffusion_rate <= 1),
    max_intensity REAL NOT NULL DEFAULT 10.0 CHECK (max_intensity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT pheromone_fields_swarm_unique UNIQUE (swarm_id)
);

-- Pheromone deposits table - individual pheromone traces
CREATE TABLE pheromone_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID NOT NULL REFERENCES pheromone_fields(id) ON DELETE CASCADE,
    depositor_id TEXT NOT NULL,
    pheromone_type TEXT NOT NULL CHECK (pheromone_type IN (
        'attraction', 'repulsion', 'trail', 'alarm', 'food',
        'nest', 'boundary', 'convergence', 'quality'
    )),
    position JSONB NOT NULL,
    strength REAL NOT NULL CHECK (strength >= 0),
    evaporation_rate REAL NOT NULL DEFAULT 0.1,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour'
);

-- Swarm messages table - inter-agent communication
CREATE TABLE swarm_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swarm_id UUID NOT NULL REFERENCES swarms(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    recipient_ids TEXT[] NOT NULL, -- Array of recipient IDs or ['broadcast']
    message_type TEXT NOT NULL CHECK (message_type IN (
        'discovery', 'recruitment', 'warning', 'coordination',
        'consensus', 'innovation', 'evaluation', 'heartbeat'
    )),
    content JSONB NOT NULL,
    priority REAL NOT NULL DEFAULT 0.5 CHECK (priority >= 0 AND priority <= 1),
    ttl INTEGER NOT NULL DEFAULT 5, -- Time to live in hops
    hops INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes'
);

-- Emergent patterns table - detected collective behaviors
CREATE TABLE emergent_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swarm_id UUID NOT NULL REFERENCES swarms(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL CHECK (pattern_type IN (
        'flocking', 'swarming', 'foraging', 'sorting', 'clustering',
        'synchronization', 'wave', 'spiral', 'branching', 'crystallization'
    )),
    strength REAL NOT NULL CHECK (strength >= 0 AND strength <= 1),
    participants TEXT[] NOT NULL,
    stability REAL NOT NULL CHECK (stability >= 0 AND stability <= 1),
    benefit REAL NOT NULL CHECK (benefit >= -1 AND benefit <= 1),
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    first_detected TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_observed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT emergent_patterns_active_unique UNIQUE (swarm_id, pattern_type, first_detected)
);

-- Swarm consensus table - collective decisions
CREATE TABLE swarm_consensus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swarm_id UUID NOT NULL REFERENCES swarms(id) ON DELETE CASCADE,
    consensus_algorithm TEXT NOT NULL CHECK (consensus_algorithm IN (
        'honeybee', 'antcolony', 'byzantine', 'raft',
        'proof-of-work', 'liquid', 'holographic'
    )),
    proposals JSONB NOT NULL DEFAULT '[]',
    votes JSONB NOT NULL DEFAULT '{}',
    agreement REAL NOT NULL DEFAULT 0 CHECK (agreement >= 0 AND agreement <= 1),
    stability REAL NOT NULL DEFAULT 0 CHECK (stability >= 0 AND stability <= 1),
    dissenters TEXT[] NOT NULL DEFAULT '{}',
    rounds INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'voting', 'reached', 'failed'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Distributed solutions table - collaborative problem solving results
CREATE TABLE distributed_solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swarm_id UUID NOT NULL REFERENCES swarms(id) ON DELETE CASCADE,
    problem_id TEXT NOT NULL,
    fragments JSONB NOT NULL DEFAULT '[]',
    assembly_strategy TEXT NOT NULL CHECK (assembly_strategy IN (
        'hierarchical', 'mosaic', 'consensus', 'weighted', 'evolutionary', 'crystalline'
    )),
    quality REAL NOT NULL CHECK (quality >= 0 AND quality <= 1),
    completeness REAL NOT NULL CHECK (completeness >= 0 AND completeness <= 1),
    contributors TEXT[] NOT NULL,
    iterations INTEGER NOT NULL DEFAULT 0,
    solution_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    
    CONSTRAINT distributed_solutions_unique UNIQUE (swarm_id, problem_id)
);

-- Swarm metrics table - performance tracking
CREATE TABLE swarm_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swarm_id UUID NOT NULL REFERENCES swarms(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    efficiency REAL NOT NULL CHECK (efficiency >= 0 AND efficiency <= 1),
    scalability REAL NOT NULL CHECK (scalability >= 0 AND scalability <= 1),
    robustness REAL NOT NULL CHECK (robustness >= 0 AND robustness <= 1),
    adaptability REAL NOT NULL CHECK (adaptability >= 0 AND adaptability <= 1),
    convergence_speed REAL NOT NULL CHECK (convergence_speed >= 0 AND convergence_speed <= 1),
    solution_quality REAL NOT NULL CHECK (solution_quality >= 0 AND solution_quality <= 1),
    resource_usage REAL NOT NULL CHECK (resource_usage >= 0 AND resource_usage <= 1),
    communication_overhead REAL NOT NULL CHECK (communication_overhead >= 0 AND communication_overhead <= 1),
    emergence_index REAL NOT NULL CHECK (emergence_index >= 0),
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX idx_swarms_enterprise_id ON swarms(enterprise_id);
CREATE INDEX idx_swarms_status ON swarms(status);
CREATE INDEX idx_swarms_phase ON swarms(phase);
CREATE INDEX idx_swarms_created_at ON swarms(created_at DESC);

CREATE INDEX idx_swarm_agents_swarm_id ON swarm_agents(swarm_id);
CREATE INDEX idx_swarm_agents_fitness ON swarm_agents(fitness DESC);
CREATE INDEX idx_swarm_agents_agent_type ON swarm_agents(agent_type);

CREATE INDEX idx_pheromone_deposits_field_id ON pheromone_deposits(field_id);
CREATE INDEX idx_pheromone_deposits_type ON pheromone_deposits(pheromone_type);
CREATE INDEX idx_pheromone_deposits_expires_at ON pheromone_deposits(expires_at);
CREATE INDEX idx_pheromone_deposits_position ON pheromone_deposits USING GIN (position);

CREATE INDEX idx_swarm_messages_swarm_id ON swarm_messages(swarm_id);
CREATE INDEX idx_swarm_messages_type ON swarm_messages(message_type);
CREATE INDEX idx_swarm_messages_expires_at ON swarm_messages(expires_at);

CREATE INDEX idx_emergent_patterns_swarm_id ON emergent_patterns(swarm_id);
CREATE INDEX idx_emergent_patterns_type ON emergent_patterns(pattern_type);
CREATE INDEX idx_emergent_patterns_strength ON emergent_patterns(strength DESC);

CREATE INDEX idx_swarm_consensus_swarm_id ON swarm_consensus(swarm_id);
CREATE INDEX idx_swarm_consensus_status ON swarm_consensus(status);
CREATE INDEX idx_swarm_consensus_agreement ON swarm_consensus(agreement DESC);

CREATE INDEX idx_distributed_solutions_swarm_id ON distributed_solutions(swarm_id);
CREATE INDEX idx_distributed_solutions_quality ON distributed_solutions(quality DESC);

CREATE INDEX idx_swarm_metrics_swarm_id ON swarm_metrics(swarm_id);
CREATE INDEX idx_swarm_metrics_timestamp ON swarm_metrics(timestamp DESC);

-- Update triggers
CREATE TRIGGER maintain_swarm_updated_at 
    BEFORE UPDATE ON swarms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER maintain_swarm_agent_updated_at 
    BEFORE UPDATE ON swarm_agents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER maintain_pheromone_field_updated_at 
    BEFORE UPDATE ON pheromone_fields 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER maintain_swarm_consensus_updated_at 
    BEFORE UPDATE ON swarm_consensus 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER maintain_emergent_patterns_updated_at 
    BEFORE UPDATE ON emergent_patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE swarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE swarm_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pheromone_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE pheromone_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE swarm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergent_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE swarm_consensus ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributed_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE swarm_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for swarms
CREATE POLICY "Users can view swarms in their enterprise" ON swarms
    FOR SELECT USING (
        enterprise_id IN (
            SELECT enterprise_id FROM enterprise_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create swarms in their enterprise" ON swarms
    FOR INSERT WITH CHECK (
        enterprise_id IN (
            SELECT enterprise_id FROM enterprise_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update swarms in their enterprise" ON swarms
    FOR UPDATE USING (
        enterprise_id IN (
            SELECT enterprise_id FROM enterprise_users 
            WHERE user_id = auth.uid()
        )
    );

-- Similar policies for other tables
CREATE POLICY "Users can view swarm agents" ON swarm_agents
    FOR SELECT USING (
        swarm_id IN (
            SELECT id FROM swarms WHERE enterprise_id IN (
                SELECT enterprise_id FROM enterprise_users 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage swarm agents" ON swarm_agents
    FOR ALL USING (
        swarm_id IN (
            SELECT id FROM swarms WHERE enterprise_id IN (
                SELECT enterprise_id FROM enterprise_users 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Apply similar patterns for remaining tables
CREATE POLICY "Users can view pheromone fields" ON pheromone_fields
    FOR SELECT USING (
        swarm_id IN (
            SELECT id FROM swarms WHERE enterprise_id IN (
                SELECT enterprise_id FROM enterprise_users 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage pheromone fields" ON pheromone_fields
    FOR ALL USING (
        swarm_id IN (
            SELECT id FROM swarms WHERE enterprise_id IN (
                SELECT enterprise_id FROM enterprise_users 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Functions for swarm management

-- Initialize a new swarm
CREATE OR REPLACE FUNCTION initialize_swarm(
    p_enterprise_id UUID,
    p_name TEXT,
    p_problem_type TEXT,
    p_algorithm_type TEXT,
    p_problem_definition JSONB,
    p_config JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_swarm_id UUID;
BEGIN
    -- Create swarm
    INSERT INTO swarms (
        enterprise_id, name, problem_type, algorithm_type, 
        problem_definition, config, state
    ) VALUES (
        p_enterprise_id, p_name, p_problem_type, p_algorithm_type,
        p_problem_definition, p_config, jsonb_build_object(
            'phase', 'initialization',
            'convergence', 0,
            'diversity', 1,
            'coherence', 0,
            'temperature', 1,
            'polarization', 0,
            'clustering', 0,
            'efficiency', 0.5
        )
    ) RETURNING id INTO v_swarm_id;
    
    -- Initialize pheromone field
    INSERT INTO pheromone_fields (swarm_id)
    VALUES (v_swarm_id);
    
    -- Initialize consensus mechanism
    INSERT INTO swarm_consensus (
        swarm_id, 
        consensus_algorithm
    ) VALUES (
        v_swarm_id,
        CASE 
            WHEN p_algorithm_type IN ('pso', 'firefly') THEN 'honeybee'
            WHEN p_algorithm_type = 'aco' THEN 'antcolony'
            WHEN p_algorithm_type IN ('wolf', 'whale') THEN 'byzantine'
            ELSE 'holographic'
        END
    );
    
    RETURN v_swarm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add agent to swarm
CREATE OR REPLACE FUNCTION add_swarm_agent(
    p_swarm_id UUID,
    p_agent_id TEXT,
    p_agent_type TEXT,
    p_position JSONB DEFAULT NULL,
    p_role JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_agent_uuid UUID;
    v_position JSONB;
    v_role JSONB;
BEGIN
    -- Default position if not provided
    v_position := COALESCE(p_position, jsonb_build_object(
        'dimensions', ARRAY[random(), random(), random()],
        'confidence', 0.5,
        'timestamp', extract(epoch from now())::bigint * 1000
    ));
    
    -- Default role if not provided
    v_role := COALESCE(p_role, jsonb_build_object(
        'primary', p_agent_type,
        'secondary', '[]'::jsonb,
        'specialization', 0.7,
        'flexibility', 0.3
    ));
    
    INSERT INTO swarm_agents (
        swarm_id, agent_id, agent_type, position, role
    ) VALUES (
        p_swarm_id, p_agent_id, p_agent_type, v_position, v_role
    ) RETURNING id INTO v_agent_uuid;
    
    RETURN v_agent_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deposit pheromone
CREATE OR REPLACE FUNCTION deposit_pheromone(
    p_swarm_id UUID,
    p_depositor_id TEXT,
    p_pheromone_type TEXT,
    p_position JSONB,
    p_strength REAL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_field_id UUID;
    v_deposit_id UUID;
BEGIN
    -- Get field ID
    SELECT id INTO v_field_id
    FROM pheromone_fields
    WHERE swarm_id = p_swarm_id;
    
    IF v_field_id IS NULL THEN
        RAISE EXCEPTION 'Pheromone field not found for swarm %', p_swarm_id;
    END IF;
    
    -- Create deposit
    INSERT INTO pheromone_deposits (
        field_id, depositor_id, pheromone_type, 
        position, strength, metadata
    ) VALUES (
        v_field_id, p_depositor_id, p_pheromone_type,
        p_position, p_strength, p_metadata
    ) RETURNING id INTO v_deposit_id;
    
    RETURN v_deposit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send swarm message
CREATE OR REPLACE FUNCTION send_swarm_message(
    p_swarm_id UUID,
    p_sender_id TEXT,
    p_recipient_ids TEXT[],
    p_message_type TEXT,
    p_content JSONB,
    p_priority REAL DEFAULT 0.5,
    p_ttl INTEGER DEFAULT 5
) RETURNS UUID AS $$
DECLARE
    v_message_id UUID;
BEGIN
    INSERT INTO swarm_messages (
        swarm_id, sender_id, recipient_ids,
        message_type, content, priority, ttl
    ) VALUES (
        p_swarm_id, p_sender_id, p_recipient_ids,
        p_message_type, p_content, p_priority, p_ttl
    ) RETURNING id INTO v_message_id;
    
    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Detect emergent pattern
CREATE OR REPLACE FUNCTION detect_emergent_pattern(
    p_swarm_id UUID,
    p_pattern_type TEXT,
    p_participants TEXT[],
    p_strength REAL,
    p_stability REAL,
    p_benefit REAL,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_pattern_id UUID;
BEGIN
    -- Check if similar pattern exists
    SELECT id INTO v_pattern_id
    FROM emergent_patterns
    WHERE swarm_id = p_swarm_id
    AND pattern_type = p_pattern_type
    AND last_observed > NOW() - INTERVAL '5 minutes';
    
    IF v_pattern_id IS NOT NULL THEN
        -- Update existing pattern
        UPDATE emergent_patterns
        SET strength = p_strength,
            participants = p_participants,
            stability = p_stability,
            benefit = p_benefit,
            last_observed = NOW(),
            metadata = p_metadata
        WHERE id = v_pattern_id;
    ELSE
        -- Create new pattern
        INSERT INTO emergent_patterns (
            swarm_id, pattern_type, strength, participants,
            stability, benefit, description, metadata
        ) VALUES (
            p_swarm_id, p_pattern_type, p_strength, p_participants,
            p_stability, p_benefit, p_description, p_metadata
        ) RETURNING id INTO v_pattern_id;
    END IF;
    
    RETURN v_pattern_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update swarm metrics
CREATE OR REPLACE FUNCTION update_swarm_metrics(
    p_swarm_id UUID,
    p_metrics JSONB
) RETURNS UUID AS $$
DECLARE
    v_metric_id UUID;
BEGIN
    INSERT INTO swarm_metrics (
        swarm_id,
        efficiency,
        scalability,
        robustness,
        adaptability,
        convergence_speed,
        solution_quality,
        resource_usage,
        communication_overhead,
        emergence_index,
        metadata
    ) VALUES (
        p_swarm_id,
        (p_metrics->>'efficiency')::REAL,
        (p_metrics->>'scalability')::REAL,
        (p_metrics->>'robustness')::REAL,
        (p_metrics->>'adaptability')::REAL,
        (p_metrics->>'convergence_speed')::REAL,
        (p_metrics->>'solution_quality')::REAL,
        (p_metrics->>'resource_usage')::REAL,
        (p_metrics->>'communication_overhead')::REAL,
        (p_metrics->>'emergence_index')::REAL,
        COALESCE(p_metrics->'metadata', '{}'::jsonb)
    ) RETURNING id INTO v_metric_id;
    
    -- Update swarm performance metrics
    UPDATE swarms
    SET performance_metrics = p_metrics
    WHERE id = p_swarm_id;
    
    RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get swarm state with all related data
CREATE OR REPLACE FUNCTION get_swarm_state(p_swarm_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'swarm', row_to_json(s.*),
        'agents', COALESCE(
            jsonb_agg(DISTINCT jsonb_build_object(
                'id', a.id,
                'agent_id', a.agent_id,
                'type', a.agent_type,
                'position', a.position,
                'fitness', a.fitness,
                'state', a.state
            )) FILTER (WHERE a.id IS NOT NULL), 
            '[]'::jsonb
        ),
        'active_patterns', COALESCE(
            jsonb_agg(DISTINCT jsonb_build_object(
                'type', ep.pattern_type,
                'strength', ep.strength,
                'participants', ep.participants,
                'stability', ep.stability
            )) FILTER (WHERE ep.id IS NOT NULL AND ep.last_observed > NOW() - INTERVAL '10 minutes'),
            '[]'::jsonb
        ),
        'consensus', COALESCE(row_to_json(c.*), '{}'::jsonb),
        'latest_metrics', COALESCE(
            (SELECT row_to_json(m.*)
             FROM swarm_metrics m
             WHERE m.swarm_id = s.id
             ORDER BY m.timestamp DESC
             LIMIT 1),
            '{}'::jsonb
        )
    ) INTO v_result
    FROM swarms s
    LEFT JOIN swarm_agents a ON a.swarm_id = s.id
    LEFT JOIN emergent_patterns ep ON ep.swarm_id = s.id
    LEFT JOIN swarm_consensus c ON c.swarm_id = s.id
    WHERE s.id = p_swarm_id
    GROUP BY s.id, c.id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired data
CREATE OR REPLACE FUNCTION cleanup_swarm_data()
RETURNS void AS $$
BEGIN
    -- Delete expired pheromone deposits
    DELETE FROM pheromone_deposits
    WHERE expires_at < NOW();
    
    -- Delete expired messages
    DELETE FROM swarm_messages
    WHERE expires_at < NOW();
    
    -- Archive old patterns
    UPDATE emergent_patterns
    SET metadata = metadata || jsonb_build_object('archived', true)
    WHERE last_observed < NOW() - INTERVAL '1 hour';
    
    -- Clean up completed swarms older than 7 days
    DELETE FROM swarms
    WHERE status = 'completed'
    AND completed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON swarms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON swarm_agents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pheromone_fields TO authenticated;
GRANT SELECT, INSERT, DELETE ON pheromone_deposits TO authenticated;
GRANT SELECT, INSERT, DELETE ON swarm_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON emergent_patterns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON swarm_consensus TO authenticated;
GRANT SELECT, INSERT ON distributed_solutions TO authenticated;
GRANT SELECT, INSERT ON swarm_metrics TO authenticated;

GRANT EXECUTE ON FUNCTION initialize_swarm TO authenticated;
GRANT EXECUTE ON FUNCTION add_swarm_agent TO authenticated;
GRANT EXECUTE ON FUNCTION deposit_pheromone TO authenticated;
GRANT EXECUTE ON FUNCTION send_swarm_message TO authenticated;
GRANT EXECUTE ON FUNCTION detect_emergent_pattern TO authenticated;
GRANT EXECUTE ON FUNCTION update_swarm_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_swarm_state TO authenticated;

-- Comments
COMMENT ON TABLE swarms IS 'Swarm intelligence instances for collective problem solving';
COMMENT ON TABLE swarm_agents IS 'Individual agents participating in swarm intelligence';
COMMENT ON TABLE pheromone_fields IS 'Stigmergic communication environment';
COMMENT ON TABLE pheromone_deposits IS 'Individual pheromone traces for indirect coordination';
COMMENT ON TABLE swarm_messages IS 'Direct inter-agent communication messages';
COMMENT ON TABLE emergent_patterns IS 'Detected collective behaviors and formations';
COMMENT ON TABLE swarm_consensus IS 'Collective decision-making processes';
COMMENT ON TABLE distributed_solutions IS 'Collaborative problem-solving results';
COMMENT ON TABLE swarm_metrics IS 'Performance metrics for swarm optimization';