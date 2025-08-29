"use client";

import { ArrowLeft, FileText, Upload, Wand2 } from "lucide-react";
import { CalendarIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { ContractForm } from "@/app/_components/contracts/ContractForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Id } from '@/types/id.types';

// Mock Id type
type Id<T extends string> = string & { __tableName: T };

interface TemplateVariable {
  name: string;
  type: "text" | "date" | "number" | "select";
  defaultValue?: string;
  options?: string[];
  required: boolean;
  description?: string;
}

interface Template {
  _id: Id<"contractTemplates">;
  name: string;
  description?: string;
  variables: TemplateVariable[];
  category: string;
  usageCount: number;
}

interface Vendor {
  _id: Id<"vendors">;
  name: string;
}

export default function NewContractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");

  const [useTemplate, setUseTemplate] = useState(!!templateId);
  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"contractTemplates"> | null>(templateId as Id<"contractTemplates"> | null);
  const [showVariableDialog, setShowVariableDialog] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string | number | undefined>>({});
  const [contractData, setContractData] = useState({
    title: "",
    vendorId: "",
    value: 0,
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    notes: "",
  });

  // Mock data - replace with actual Supabase implementation
  const template: Template | null = null;
  const templates: Template[] = [];
  const vendors: Vendor[] = [];
  const useTemplateAction = (args: { 
    templateId: Id<"contractTemplates">, 
    variableValues: Record<string, string | number | undefined>,
    contractData: {
      title: string;
      vendorId?: Id<"vendors">;
      value: number;
      startDate?: string;
      endDate?: string;
      notes: string;
    }
  }) => Promise.resolve({ message: "Contract generated" });

  // Initialize variable values from template
  useEffect(() => {
    if (template && template.variables) {
      const initialValues: Record<string, string | number | undefined> = {};
      template.variables.forEach((variable) => {
        if (variable.defaultValue) {
          initialValues[variable.name] = variable.defaultValue;
        }
      });
      setVariableValues(initialValues);
    }
  }, [template]);

  const handleTemplateSelection = (templateId: Id<"contractTemplates">) => {
    setSelectedTemplateId(templateId);
    setUseTemplate(true);
  };

  const handleProceedWithTemplate = () => {
    if (template && template.variables && template.variables.length > 0) {
      setShowVariableDialog(true);
    } else {
      handleGenerateContract();
    }
  };

  const handleGenerateContract = async () => {
    if (!selectedTemplateId || !contractData.title) {
      toast.error("Please provide a contract title");
      return;
    }

    try {
      const result = await useTemplateAction({
        templateId: selectedTemplateId,
        variableValues,
        contractData: {
          ...contractData,
          vendorId: contractData.vendorId as Id<"vendors"> | undefined,
          startDate: contractData.startDate?.toISOString(),
          endDate: contractData.endDate?.toISOString(),
        },
      });

      toast.success(result.message);
      
      // In a real implementation, this would download the generated contract
      // and then navigate to the contract upload form
      console.log("Generated contract:", result);
      
      // For now, just go back to contracts page
      router.push("/dashboard/contracts");
    } catch (error) {
      toast.error("Failed to generate contract from template");
    }
  };

  if (useTemplate && selectedTemplateId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Create Contract from Template</h1>
            <p className="text-muted-foreground mt-1">
              Fill in the details to generate your contract
            </p>
          </div>
        </div>

        {template && (
          <div className="space-y-6">
            {/* Template Info */}
            <Card>
              <CardHeader>
                <CardTitle>Using Template: {template.name}</CardTitle>
                {template.description && (
                  <CardDescription>{template.description}</CardDescription>
                )}
              </CardHeader>
            </Card>

            {/* Contract Details */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Details</CardTitle>
                <CardDescription>
                  Provide basic information about the contract
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Contract Title *</Label>
                  <Input
                    id="title"
                    value={contractData.title}
                    onChange={(e) =>
                      setContractData({ ...contractData, title: e.target.value })
                    }
                    placeholder="e.g., Website Development Agreement"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="vendor">Vendor</Label>
                  <Select
                    value={contractData.vendorId}
                    onValueChange={(value) =>
                      setContractData({ ...contractData, vendorId: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a vendor (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors?.map((vendor) => (
                        <SelectItem key={vendor._id} value={vendor._id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="value">Contract Value</Label>
                    <Input
                      id="value"
                      type="number"
                      value={contractData.value}
                      onChange={(e) =>
                        setContractData({
                          ...contractData,
                          value: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal mt-1",
                              !contractData.startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {contractData.startDate ? (
                              format(contractData.startDate, "PP")
                            ) : (
                              <span>Pick date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={contractData.startDate}
                            onSelect={(date) =>
                              setContractData({ ...contractData, startDate: date })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal mt-1",
                              !contractData.endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {contractData.endDate ? (
                              format(contractData.endDate, "PP")
                            ) : (
                              <span>Pick date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={contractData.endDate}
                            onSelect={(date) =>
                              setContractData({ ...contractData, endDate: date })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={contractData.notes}
                    onChange={(e) =>
                      setContractData({ ...contractData, notes: e.target.value })
                    }
                    placeholder="Any additional notes or requirements..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setUseTemplate(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleProceedWithTemplate}>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate Contract
              </Button>
            </div>
          </div>
        )}

        {/* Variable Input Dialog */}
        {template && template.variables && (
          <Dialog open={showVariableDialog} onOpenChange={setShowVariableDialog}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Fill in Template Variables</DialogTitle>
                <DialogDescription>
                  Provide values for the template variables
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {template.variables.map((variable) => (
                  <div key={variable.name}>
                    <Label htmlFor={variable.name}>
                      {variable.name}
                      {variable.required && " *"}
                    </Label>
                    {variable.description && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {variable.description}
                      </p>
                    )}
                    {variable.type === "text" && (
                      <Input
                        id={variable.name}
                        value={variableValues[variable.name] as string || ""}
                        onChange={(e) =>
                          setVariableValues({
                            ...variableValues,
                            [variable.name]: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    )}
                    {variable.type === "number" && (
                      <Input
                        id={variable.name}
                        type="number"
                        value={variableValues[variable.name] as number || ""}
                        onChange={(e) =>
                          setVariableValues({
                            ...variableValues,
                            [variable.name]: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="mt-1"
                      />
                    )}
                    {variable.type === "date" && (
                      <Input
                        id={variable.name}
                        type="date"
                        value={variableValues[variable.name] as string || ""}
                        onChange={(e) =>
                          setVariableValues({
                            ...variableValues,
                            [variable.name]: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    )}
                    {variable.type === "select" && variable.options && (
                      <Select
                        value={variableValues[variable.name] as string || ""}
                        onValueChange={(value) =>
                          setVariableValues({
                            ...variableValues,
                            [variable.name]: value,
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {variable.options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowVariableDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowVariableDialog(false);
                    handleGenerateContract();
                  }}
                >
                  Generate Contract
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // Template Selection View
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Create New Contract</h1>
          <p className="text-muted-foreground mt-1">
            Choose how you want to create your contract
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setUseTemplate(true)}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Use a Template
            </CardTitle>
            <CardDescription>
              Generate a contract from a pre-defined template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Quick and easy way to create standard contracts with customizable
              variables.
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push("/dashboard/contracts/upload")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Contract
            </CardTitle>
            <CardDescription>
              Upload an existing contract document
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload your own contract file for AI-powered analysis and
              management.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Template Selection */}
      {useTemplate && templates && templates.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Select a Template</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card
                key={template._id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleTemplateSelection(template._id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {template.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{template.category}</span>
                    <span>•</span>
                    <span>Used {template.usageCount} times</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {useTemplate && (!templates || templates.length === 0) && (
        <Alert>
          <AlertDescription>
            No templates available. Please create a template first or upload a
            contract directly.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
