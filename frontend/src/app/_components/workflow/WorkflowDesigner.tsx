'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Play, 
  Square, 
  Diamond, 
  Circle, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Settings, 
  Copy,
  Save,
  Eye,
  Edit,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreVertical,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { showToast } from '../common/ToastNotifications';

// Workflow node types
export type WorkflowNodeType = 'start' | 'approval' | 'condition' | 'action' | 'end';

// Workflow node structure
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  title: string;
  description?: string;
  position: { x: number; y: number };
  data: {
    approvers?: string[];
    requiredApprovals?: number;
    condition?: string;
    action?: string;
    timeLimit?: number;
    autoApprove?: boolean;
    escalation?: {
      enabled: boolean;
      timeLimit: number;
      escalateTo: string[];
    };
  };
  connections: string[]; // IDs of connected nodes
}

// Workflow definition
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  category: 'contract' | 'vendor' | 'general';
  status: 'draft' | 'active' | 'inactive';
  nodes: WorkflowNode[];
  trigger: {
    type: 'manual' | 'automatic';
    conditions?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Node type configurations
const nodeTypeConfig = {
  start: {
    icon: Play,
    label: 'Start',
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Workflow starting point'
  },
  approval: {
    icon: Users,
    label: 'Approval',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Requires approval from specified users'
  },
  condition: {
    icon: Diamond,
    label: 'Condition',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'Conditional branching based on criteria'
  },
  action: {
    icon: Zap,
    label: 'Action',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Automated action or task'
  },
  end: {
    icon: Square,
    label: 'End',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'Workflow completion point'
  }
};

// Workflow designer component
export interface WorkflowDesignerProps {
  workflow?: Workflow;
  onSave?: (workflow: Workflow) => Promise<void>;
  onPreview?: (workflow: Workflow) => void;
  readonly?: boolean;
  className?: string;
}

export const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  workflow: initialWorkflow,
  onSave,
  onPreview,
  readonly = false,
  className
}) => {
  // State
  const [workflow, setWorkflow] = useState<Workflow>(
    initialWorkflow || {
      id: `workflow_${Date.now()}`,
      name: 'New Workflow',
      description: '',
      category: 'contract',
      status: 'draft',
      nodes: [],
      trigger: { type: 'manual' },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  );

  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [draggedNodeType, setDraggedNodeType] = useState<WorkflowNodeType | null>(null);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  // Add node to workflow
  const addNode = useCallback((type: WorkflowNodeType, position: { x: number; y: number }) => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type,
      title: `${nodeTypeConfig[type].label} ${workflow.nodes.length + 1}`,
      position,
      data: {},
      connections: []
    };

    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      updatedAt: new Date()
    }));

    return newNode;
  }, [workflow.nodes.length]);

  // Update node
  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      ),
      updatedAt: new Date()
    }));
  }, []);

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId)
        .map(node => ({
          ...node,
          connections: node.connections.filter(conn => conn !== nodeId)
        })),
      updatedAt: new Date()
    }));
  }, []);

  // Connect nodes
  const connectNodes = useCallback((fromId: string, toId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === fromId 
          ? { ...node, connections: [...node.connections, toId] }
          : node
      ),
      updatedAt: new Date()
    }));
  }, []);

  // Handle canvas drop
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedNodeType) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    addNode(draggedNodeType, position);
    setDraggedNodeType(null);
  }, [draggedNodeType, addNode]);

  // Handle save
  const handleSave = async () => {
    if (!onSave) return;

    try {
      await onSave(workflow);
      showToast.success('Workflow saved successfully', {});
    } catch (error) {
      showToast.error('Failed to save workflow', {});
    }
  };

  // Node component
  const WorkflowNodeComponent: React.FC<{ node: WorkflowNode }> = ({ node }) => {
    const config = nodeTypeConfig[node.type];
    const IconComponent = config.icon;

    return (
      <div
        className={cn(
          'absolute border-2 rounded-lg p-3 bg-background shadow-md cursor-pointer transition-all hover:shadow-lg',
          config.color,
          selectedNode?.id === node.id && 'ring-2 ring-primary'
        )}
        style={{
          left: node.position.x,
          top: node.position.y,
          width: '180px'
        }}
        onClick={() => setSelectedNode(node)}
        onDoubleClick={() => setIsNodeDialogOpen(true)}
      >
        <div className="flex items-center gap-2 mb-2">
          <IconComponent className="h-4 w-4" />
          <span className="font-medium text-sm truncate">{node.title}</span>
        </div>
        
        {node.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {node.description}
          </p>
        )}

        {/* Connection indicators */}
        {node.connections.length > 0 && (
          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
              <ArrowRight className="h-2 w-2 text-primary-foreground" />
            </div>
          </div>
        )}

        {/* Node actions */}
        {!readonly && (
          <div className="absolute -top-2 -right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 bg-background shadow-sm">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setIsNodeDialogOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const newNode = { ...node, id: `node_${Date.now()}`, position: { x: node.position.x + 200, y: node.position.y } };
                  setWorkflow(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => deleteNode(node.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    );
  };

  // Node palette
  const NodePalette: React.FC = () => (
    <Card className="w-64">
      <CardHeader>
        <CardTitle className="text-sm">Workflow Elements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(nodeTypeConfig).map(([type, config]) => {
          const IconComponent = config.icon;
          return (
            <div
              key={type}
              draggable
              onDragStart={() => setDraggedNodeType(type as WorkflowNodeType)}
              className={cn(
                'flex items-center gap-2 p-2 rounded border cursor-move transition-colors hover:bg-muted',
                config.color
              )}
            >
              <IconComponent className="h-4 w-4" />
              <div className="flex-1">
                <p className="font-medium text-xs">{config.label}</p>
                <p className="text-xs opacity-75">{config.description}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  // Node editor dialog
  const NodeEditorDialog: React.FC = () => {
    if (!selectedNode) return null;

    return (
      <Dialog open={isNodeDialogOpen} onOpenChange={setIsNodeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {nodeTypeConfig[selectedNode.type].label}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="conditions">Conditions</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={selectedNode.title}
                  onChange={(e) => updateNode(selectedNode.id, { title: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={selectedNode.description || ''}
                  onChange={(e) => updateNode(selectedNode.id, { description: e.target.value })}
                />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              {selectedNode.type === 'approval' && (
                <>
                  <div>
                    <Label>Required Approvals</Label>
                    <Input
                      type="number"
                      value={selectedNode.data.requiredApprovals || 1}
                      onChange={(e) => updateNode(selectedNode.id, {
                        data: { ...selectedNode.data, requiredApprovals: parseInt(e.target.value) }
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label>Time Limit (hours)</Label>
                    <Input
                      type="number"
                      value={selectedNode.data.timeLimit || 24}
                      onChange={(e) => updateNode(selectedNode.id, {
                        data: { ...selectedNode.data, timeLimit: parseInt(e.target.value) }
                      })}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={selectedNode.data.autoApprove || false}
                      onCheckedChange={(checked) => updateNode(selectedNode.id, {
                        data: { ...selectedNode.data, autoApprove: checked }
                      })}
                    />
                    <Label>Auto-approve if no response</Label>
                  </div>
                </>
              )}

              {selectedNode.type === 'condition' && (
                <div>
                  <Label>Condition Logic</Label>
                  <Textarea
                    placeholder="e.g., contract.value > 10000"
                    value={selectedNode.data.condition || ''}
                    onChange={(e) => updateNode(selectedNode.id, {
                      data: { ...selectedNode.data, condition: e.target.value }
                    })}
                  />
                </div>
              )}

              {selectedNode.type === 'action' && (
                <div>
                  <Label>Action Type</Label>
                  <Select
                    value={selectedNode.data.action || ''}
                    onValueChange={(value) => updateNode(selectedNode.id, {
                      data: { ...selectedNode.data, action: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="send_email">Send Email</SelectItem>
                      <SelectItem value="update_status">Update Status</SelectItem>
                      <SelectItem value="create_task">Create Task</SelectItem>
                      <SelectItem value="send_notification">Send Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            <TabsContent value="conditions" className="space-y-4">
              <div>
                <Label>Escalation Settings</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={selectedNode.data.escalation?.enabled || false}
                      onCheckedChange={(checked) => updateNode(selectedNode.id, {
                        data: {
                          ...selectedNode.data,
                          escalation: { 
                            enabled: checked,
                            timeLimit: selectedNode.data.escalation?.timeLimit || 24,
                            escalateTo: selectedNode.data.escalation?.escalateTo || []
                          }
                        }
                      })}
                    />
                    <Label>Enable escalation</Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsNodeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsNodeDialogOpen(false)}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className={cn('flex h-full bg-background', className)}>
      {/* Left sidebar - Node palette */}
      {!readonly && <NodePalette />}

      {/* Main canvas area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="border-b p-4 flex items-center justify-between bg-background">
          <div className="flex items-center gap-4">
            <div>
              <Input
                value={workflow.name}
                onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                className="font-medium"
                placeholder="Workflow name..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                {workflow.nodes.length} nodes • {workflow.status}
              </p>
            </div>
            
            <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'}>
              {workflow.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {onPreview && (
              <Button variant="outline" onClick={() => onPreview(workflow)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            )}
            
            {!readonly && onSave && (
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Workflow
              </Button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div
          className="flex-1 relative overflow-auto bg-grid-pattern"
          onDrop={handleCanvasDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            backgroundImage: `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        >
          {/* Workflow nodes */}
          {workflow.nodes.map(node => (
            <WorkflowNodeComponent key={node.id} node={node} />
          ))}

          {/* Connection lines */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
            {workflow.nodes.map(node =>
              node.connections.map(targetId => {
                const targetNode = workflow.nodes.find(n => n.id === targetId);
                if (!targetNode) return null;

                return (
                  <line
                    key={`${node.id}-${targetId}`}
                    x1={node.position.x + 180}
                    y1={node.position.y + 40}
                    x2={targetNode.position.x}
                    y2={targetNode.position.y + 40}
                    stroke="#6b7280"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })
            )}
            
            {/* Arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6b7280"
                />
              </marker>
            </defs>
          </svg>

          {/* Empty state */}
          {workflow.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">Start building your workflow</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag elements from the palette to create your approval process
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Node editor dialog */}
      <NodeEditorDialog />
    </div>
  );
};

export default WorkflowDesigner;