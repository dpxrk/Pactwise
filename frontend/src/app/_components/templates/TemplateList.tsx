"use client";

import { FileText, Download, Edit, Trash2, Copy } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  lastModified: string;
  usageCount: number;
  tags: string[];
}

export function TemplateList() {
  const templates: Template[] = [
    {
      id: '1',
      name: 'Standard NDA',
      description: 'Non-disclosure agreement for general use',
      category: 'Legal',
      type: 'nda',
      lastModified: '2024-01-15',
      usageCount: 45,
      tags: ['confidential', 'standard']
    },
    {
      id: '2',
      name: 'Master Service Agreement',
      description: 'Comprehensive service agreement template',
      category: 'Service',
      type: 'msa',
      lastModified: '2024-01-10',
      usageCount: 32,
      tags: ['service', 'master']
    },
    {
      id: '3',
      name: 'Software License',
      description: 'Standard software licensing agreement',
      category: 'Technology',
      type: 'license',
      lastModified: '2024-01-08',
      usageCount: 28,
      tags: ['software', 'license']
    },
    {
      id: '4',
      name: 'Employment Contract',
      description: 'Full-time employment agreement template',
      category: 'HR',
      type: 'employment',
      lastModified: '2024-01-05',
      usageCount: 15,
      tags: ['employment', 'hr']
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Contract Templates</h2>
          <p className="text-muted-foreground">Manage and use your contract templates</p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {template.description}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{template.category}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <span>Type: {template.type.toUpperCase()}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span>Used {template.usageCount} times</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span>Modified: {new Date(template.lastModified).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-1 flex-wrap mt-2">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex gap-1">
                <Button size="sm" variant="ghost">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Button size="sm">Use Template</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default TemplateList;