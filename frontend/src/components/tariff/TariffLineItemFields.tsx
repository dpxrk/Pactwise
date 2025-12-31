'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  Globe,
  Calculator,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import HTSCodeSelector from './HTSCodeSelector';

interface CountryOption {
  country_code: string;
  country_name: string;
  is_usmca_country?: boolean;
  has_fta?: boolean;
}

interface TariffBreakdown {
  base_rate: number;
  country_additional_rate: number;
  product_specific_rate: number;
  total_rate: number;
  breakdown: {
    hts_description?: string;
    country_name?: string;
    components?: Array<{
      type: string;
      rate: number;
      description: string;
    }>;
  };
}

interface LineItemTariffData {
  hts_code: string | null;
  hts_description: string | null;
  hts_confidence: number | null;
  hts_match_method: string | null;
  origin_country: string | null;
  origin_country_name: string | null;
  is_usmca_qualifying: boolean;
  tariff_rate: number | null;
  tariff_cost: number | null;
  tariff_breakdown: TariffBreakdown | null;
}

interface TariffLineItemFieldsProps {
  lineItemId: string;
  itemName: string;
  itemDescription?: string;
  totalPrice: number;
  initialData: Partial<LineItemTariffData>;
  onChange: (data: Partial<LineItemTariffData>) => void;
  onTariffCalculated?: (tariffCost: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Tariff-related fields for line item editing
 * Includes HTS code selection, country of origin, USMCA toggle, and tariff calculation
 */
export default function TariffLineItemFields({
  lineItemId,
  itemName,
  itemDescription,
  totalPrice,
  initialData,
  onChange,
  onTariffCalculated,
  disabled = false,
  className,
}: TariffLineItemFieldsProps) {
  const supabase = createClient();
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [data, setData] = useState<Partial<LineItemTariffData>>(initialData);

  // Load available countries
  useEffect(() => {
    loadCountries();
  }, []);

  // Sync with initial data changes
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const loadCountries = async () => {
    try {
      const { data: countryData, error } = await supabase
        .from('country_tariff_rules')
        .select('country_code, country_name, is_usmca_country, has_fta')
        .neq('country_code', 'DEFAULT')
        .order('country_name');

      if (error) throw error;
      setCountries(countryData || []);
    } catch (error) {
      console.error('Error loading countries:', error);
    } finally {
      setLoadingCountries(false);
    }
  };

  const updateField = <K extends keyof LineItemTariffData>(
    field: K,
    value: LineItemTariffData[K]
  ) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onChange(newData);
  };

  const handleHTSChange = (code: string, description?: string) => {
    const newData = {
      ...data,
      hts_code: code || null,
      hts_description: description || null,
    };
    setData(newData);
    onChange(newData);
  };

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find((c) => c.country_code === countryCode);
    const newData = {
      ...data,
      origin_country: countryCode || null,
      origin_country_name: country?.country_name || null,
      // Auto-disable USMCA if not a USMCA country
      is_usmca_qualifying: country?.is_usmca_country ? data.is_usmca_qualifying : false,
    };
    setData(newData);
    onChange(newData);
  };

  const calculateTariff = async () => {
    if (!data.hts_code || !data.origin_country) {
      toast.error('HTS code and origin country are required to calculate tariff');
      return;
    }

    setCalculating(true);
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tariff-calculation`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hts_code: data.hts_code,
            origin_country: data.origin_country,
            value: totalPrice,
            is_usmca_qualifying: data.is_usmca_qualifying,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to calculate tariff');

      const result = await response.json();
      const tariffData = result.data;

      const newData = {
        ...data,
        tariff_rate: tariffData.total_rate,
        tariff_cost: tariffData.tariff_cost,
        tariff_breakdown: {
          base_rate: tariffData.base_rate,
          country_additional_rate: tariffData.country_additional_rate,
          product_specific_rate: tariffData.product_specific_rate,
          total_rate: tariffData.total_rate,
          breakdown: tariffData.breakdown,
        },
      };

      setData(newData);
      onChange(newData);
      onTariffCalculated?.(tariffData.tariff_cost);
      toast.success('Tariff calculated successfully');
    } catch (error) {
      console.error('Error calculating tariff:', error);
      toast.error('Failed to calculate tariff');
    } finally {
      setCalculating(false);
    }
  };

  const selectedCountry = countries.find((c) => c.country_code === data.origin_country);
  const canCalculate = data.hts_code && data.origin_country;

  return (
    <div className={cn('space-y-4', className)}>
      {/* HTS Code */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-ghost-700 uppercase tracking-wider">
          HTS Code
        </Label>
        <HTSCodeSelector
          value={data.hts_code}
          onChange={handleHTSChange}
          itemName={itemName}
          itemDescription={itemDescription}
          originCountry={data.origin_country || undefined}
          confidence={data.hts_confidence || undefined}
          matchMethod={data.hts_match_method || undefined}
          disabled={disabled}
        />
        {data.hts_description && (
          <p className="text-xs text-ghost-500 mt-1">{data.hts_description}</p>
        )}
      </div>

      {/* Origin Country */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-ghost-700 uppercase tracking-wider flex items-center gap-1">
          <Globe className="h-3 w-3" />
          Country of Origin
        </Label>
        <Select
          value={data.origin_country || ''}
          onValueChange={handleCountryChange}
          disabled={disabled || loadingCountries}
        >
          <SelectTrigger className="border-ghost-300 font-mono text-sm">
            <SelectValue placeholder="Select country..." />
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem
                key={country.country_code}
                value={country.country_code}
                className="font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="text-ghost-500">{country.country_code}</span>
                  <span>{country.country_name}</span>
                  {country.is_usmca_country && (
                    <Badge variant="outline" className="text-xs px-1 py-0 text-green-700 border-green-300">
                      USMCA
                    </Badge>
                  )}
                  {country.has_fta && !country.is_usmca_country && (
                    <Badge variant="outline" className="text-xs px-1 py-0 text-blue-700 border-blue-300">
                      FTA
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* USMCA Qualifying */}
      {selectedCountry?.is_usmca_country && (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200">
          <div>
            <Label className="text-sm font-medium text-green-800">
              USMCA Qualifying
            </Label>
            <p className="text-xs text-green-600 mt-0.5">
              Product meets USMCA rules of origin for duty-free treatment
            </p>
          </div>
          <Switch
            checked={data.is_usmca_qualifying || false}
            onCheckedChange={(checked) => updateField('is_usmca_qualifying', checked)}
            disabled={disabled}
          />
        </div>
      )}

      {/* Calculate Button */}
      <div className="flex items-center gap-2">
        <Button
          onClick={calculateTariff}
          disabled={disabled || calculating || !canCalculate}
          className="bg-purple-900 text-white hover:bg-purple-800 flex-1"
        >
          {calculating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Calculator className="h-4 w-4 mr-2" />
          )}
          Calculate Tariff
        </Button>
        {data.tariff_cost !== null && data.tariff_cost !== undefined && (
          <Button
            variant="outline"
            onClick={calculateTariff}
            disabled={disabled || calculating}
            className="border-ghost-300"
            title="Recalculate"
          >
            <RefreshCw className={cn('h-4 w-4', calculating && 'animate-spin')} />
          </Button>
        )}
      </div>

      {/* Tariff Preview */}
      {(data.tariff_rate !== null && data.tariff_rate !== undefined) && (
        <div className="bg-purple-50 border border-purple-200 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">
              Tariff Calculation
            </span>
          </div>

          {/* Main Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-purple-600">Total Rate</p>
              <p className="text-lg font-mono font-bold text-purple-900">
                {data.tariff_rate?.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-purple-600">Estimated Cost</p>
              <p className="text-lg font-mono font-bold text-purple-900">
                ${data.tariff_cost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          {data.tariff_breakdown && (
            <div className="pt-3 border-t border-purple-200 space-y-1">
              <p className="text-xs text-purple-600 mb-2">Rate Breakdown</p>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div>
                  <span className="text-purple-600">Base:</span>{' '}
                  <span className="text-purple-900">{data.tariff_breakdown.base_rate}%</span>
                </div>
                <div>
                  <span className="text-purple-600">Country:</span>{' '}
                  <span className="text-purple-900">+{data.tariff_breakdown.country_additional_rate}%</span>
                </div>
                {data.tariff_breakdown.product_specific_rate > 0 && (
                  <div>
                    <span className="text-purple-600">Product:</span>{' '}
                    <span className="text-purple-900">+{data.tariff_breakdown.product_specific_rate}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warning if missing data */}
      {!canCalculate && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            {!data.hts_code && !data.origin_country && (
              <span>Select an HTS code and country of origin to calculate tariffs.</span>
            )}
            {!data.hts_code && data.origin_country && (
              <span>Select an HTS code to calculate tariffs.</span>
            )}
            {data.hts_code && !data.origin_country && (
              <span>Select a country of origin to calculate tariffs.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
