"use client";

import { ArrowLeft, FileText, Upload, Wand2, AlertTriangle, Loader2 } from "lucide-react";
import { CalendarIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useTemplateList, useTemplate, useRenderTemplate } from "@/hooks/queries/useTemplates";
import { useVendorList } from "@/hooks/queries/useVendors";
import { format } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Id } from "@/types/id.types";

export default function NewContractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");
  const { userProfile } = useAuth();

  const [useTemplate, setUseTemplate] = useState(!!templateId);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templateId);
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

  // Fetch templates from Supabase
  const {
    data: templates,
    isLoading: templatesLoading,
    error: templatesError
  } = useTemplateList(
    userProfile?.enterprise_id as string,
    { status: "active" }
  );

  // Fetch selected template with variables
  const {
    data: selectedTemplate,
    isLoading: templateLoading
  } = useTemplate(selectedTemplateId || "");

  // Fetch vendors from Supabase
  const {
    data: vendors,
    isLoading: vendorsLoading
  } = useVendorList(
    userProfile?.enterprise_id as Id<"enterprises">,
    { status: "active" }
  );

  // Render template mutation
  const renderTemplate = useRenderTemplate();

  // Initialize variable values from template
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.variables) {
      const initialValues: Record<string, string | number | undefined> = {};
      selectedTemplate.variables.forEach((variable) => {
        if (variable.default_value) {
          initialValues[variable.variable_name] = variable.default_value;
        }
      });
      setVariableValues(initialValues);
    }
  }, [selectedTemplate]);

  const handleTemplateSelection = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setUseTemplate(true);
  };

  const handleProceedWithTemplate = () => {
    if (selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0) {
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
      // Render the template with variables
      const result = await renderTemplate.mutateAsync({
        template_id: selectedTemplateId,
        variables: variableValues as Record<string, string | number>,
      });

      toast.success("Contract generated successfully");
      // Navigate to contracts page - in a full implementation, we would create a contract record
      router.push("/dashboard/contracts");
    } catch (error) {
      toast.error("Failed to generate contract");
    }
  };

  // Loading skeleton
  if (templatesLoading || vendorsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  // Error state
  if (templatesError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="border border-red-300 bg-red-50 p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Error Loading Templates</h2>
          <p className="font-mono text-sm text-red-700">
            {templatesError instanceof Error ? templatesError.message : "Failed to load templates"}
          </p>
        </div>
      </div>
    );
  }

  if (useTemplate && selectedTemplateId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedTemplateId(null);
              setUseTemplate(false);
            }}
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

        {templateLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-96" />
          </div>
        ) : selectedTemplate ? (
          <div className="space-y-6">
            {/* Template Info */}
            <Card>
              <CardHeader>
                <CardTitle>Using Template: {selectedTemplate.name}</CardTitle>
                {selectedTemplate.description && (
                  <CardDescription>{selectedTemplate.description}</CardDescription>
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
                        <SelectItem key={vendor.id} value={vendor.id}>
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
                onClick={() => {
                  setSelectedTemplateId(null);
                  setUseTemplate(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceedWithTemplate}
                disabled={renderTemplate.isPending}
              >
                {renderTemplate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Contract
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              Template not found. Please select a different template.
            </AlertDescription>
          </Alert>
        )}

        {/* Variable Input Dialog */}
        {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
          <Dialog open={showVariableDialog} onOpenChange={setShowVariableDialog}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Fill in Template Variables</DialogTitle>
                <DialogDescription>
                  Provide values for the template variables
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {selectedTemplate.variables.map((variable) => (
                  <div key={variable.id}>
                    <Label htmlFor={variable.variable_name}>
                      {variable.variable_label || variable.variable_name}
                      {variable.is_required && " *"}
                    </Label>
                    {variable.description && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {variable.description}
                      </p>
                    )}
                    {(variable.variable_type === "text" || variable.variable_type === "string") && (
                      <Input
                        id={variable.variable_name}
                        value={variableValues[variable.variable_name] as string || ""}
                        onChange={(e) =>
                          setVariableValues({
                            ...variableValues,
                            [variable.variable_name]: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    )}
                    {variable.variable_type === "number" && (
                      <Input
                        id={variable.variable_name}
                        type="number"
                        value={variableValues[variable.variable_name] as number || ""}
                        onChange={(e) =>
                          setVariableValues({
                            ...variableValues,
                            [variable.variable_name]: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="mt-1"
                      />
                    )}
                    {variable.variable_type === "date" && (
                      <Input
                        id={variable.variable_name}
                        type="date"
                        value={variableValues[variable.variable_name] as string || ""}
                        onChange={(e) =>
                          setVariableValues({
                            ...variableValues,
                            [variable.variable_name]: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    )}
                    {variable.variable_type === "select" && variable.options && (
                      <Select
                        value={variableValues[variable.variable_name] as string || ""}
                        onValueChange={(value) =>
                          setVariableValues({
                            ...variableValues,
                            [variable.variable_name]: value,
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {(variable.options as string[]).map((option) => (
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
                  disabled={renderTemplate.isPending}
                >
                  {renderTemplate.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Contract"
                  )}
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
                key={template.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleTemplateSelection(template.id)}
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
                    <span>{template.category || template.template_type}</span>
                    <span>•</span>
                    <span>Used {template.usage_count} times</span>
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
