import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface ServiceType {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const useServiceTypes = (activeOnly: boolean = true) => {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadServiceTypes();
  }, [activeOnly]);

  const loadServiceTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const types = activeOnly
        ? await api.serviceTypes.getActive()
        : await api.serviceTypes.getAll();
      setServiceTypes(types || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "載入服務類別失敗";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Failed to load service types:", err);
      setServiceTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    loadServiceTypes();
  };

  return { serviceTypes, loading, error, refresh };
};
