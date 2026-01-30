import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type Vm } from "@shared/schema";

// GET /api/vm
export function useVm() {
  return useQuery({
    queryKey: [api.vm.get.path],
    queryFn: async () => {
      const res = await fetch(api.vm.get.path);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch VM status");
      return api.vm.get.responses[200].parse(await res.json());
    },
    // Poll every 2 seconds while running to catch status changes
    refetchInterval: (data) => (data?.state?.data?.status === "running" ? 2000 : 5000),
  });
}

// POST /api/vm/upload
export function useUploadVmImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(api.vm.upload.path, {
        method: api.vm.upload.method,
        body: formData,
        // Content-Type header is set automatically by fetch for FormData
      });

      if (!res.ok) {
        const error = api.vm.upload.responses[400].parse(await res.json());
        throw new Error(error.message);
      }
      return api.vm.upload.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vm.get.path] });
    },
  });
}

// POST /api/vm/start
export function useStartVm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.vm.start.path, {
        method: api.vm.start.method,
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const error = api.vm.start.responses[400].parse(await res.json());
        throw new Error(error.message);
      }
      return api.vm.start.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vm.get.path] });
    },
  });
}

// POST /api/vm/stop
export function useStopVm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.vm.stop.path, {
        method: api.vm.stop.method,
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const error = api.vm.stop.responses[400].parse(await res.json());
        throw new Error(error.message);
      }
      return api.vm.stop.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vm.get.path] });
    },
  });
}
