import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useState, useCallback } from "react";

type VmLogMeta = Record<string, unknown>;

function logVm(event: string, meta?: VmLogMeta) {
  const timestamp = new Date().toISOString();
  if (meta) {
    console.info(`[vm-client] ${timestamp} ${event}`, meta);
  } else {
    console.info(`[vm-client] ${timestamp} ${event}`);
  }
}

async function readBodySafe(res: Response) {
  const cloned = res.clone();
  try {
    return { json: await cloned.json(), text: null as string | null };
  } catch {
    try {
      return { json: null as unknown, text: await cloned.text() };
    } catch {
      return { json: null as unknown, text: null as string | null };
    }
  }
}

// GET /api/vm
export function useVm() {
  return useQuery({
    queryKey: [api.vm.get.path],
    queryFn: async () => {
      const startedAt = performance.now();
      const res = await fetch(api.vm.get.path);
      const durationMs = Math.round(performance.now() - startedAt);
      const body = await readBodySafe(res);
      logVm("GET /api/vm", {
        status: res.status,
        ok: res.ok,
        durationMs,
        body: body.json ?? body.text,
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch VM status");
      return api.vm.get.responses[200].parse(body.json);
    },
    retry: false,
    refetchInterval: (query) => {
      if (query.state.status === "error") return false;
      return query.state.data?.status === "running" ? 2000 : 5000;
    },
  });
}

// POST /api/vm/upload with progress tracking
export function useUploadVmImage() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback((file: File, callbacks?: {
    onSuccess?: (data: { success: boolean; path: string; filename: string }) => void;
    onError?: (error: Error) => void;
  }) => {
    setIsUploading(true);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        logVm("POST /api/vm/upload success", {
          status: xhr.status,
          bytes: xhr.responseText?.length ?? 0,
          filename: data?.filename,
        });
        queryClient.invalidateQueries({ queryKey: [api.vm.get.path] });
        queryClient.invalidateQueries({ queryKey: [api.vm.listUploads.path] });
        callbacks?.onSuccess?.(data);
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          logVm("POST /api/vm/upload error", {
            status: xhr.status,
            message: error?.message ?? "Upload failed",
          });
          callbacks?.onError?.(new Error(error.message || "Upload failed"));
        } catch {
          logVm("POST /api/vm/upload error", { status: xhr.status });
          callbacks?.onError?.(new Error("Upload failed"));
        }
      }
    });

    xhr.addEventListener("error", () => {
      setIsUploading(false);
      logVm("POST /api/vm/upload network error");
      callbacks?.onError?.(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      setIsUploading(false);
      logVm("POST /api/vm/upload aborted");
      callbacks?.onError?.(new Error("Upload aborted"));
    });

    xhr.open(api.vm.upload.method, api.vm.upload.path);
    xhr.send(formData);
  }, [queryClient]);

  return {
    upload,
    progress,
    isUploading,
    resetProgress: () => setProgress(0),
  };
}

// POST /api/vm/start
export function useStartVm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: { bootMediaFilename?: string }) => {
      const startedAt = performance.now();
      const res = await fetch(api.vm.start.path, {
        method: api.vm.start.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? {}),
      });
      const durationMs = Math.round(performance.now() - startedAt);
      const body = await readBodySafe(res);
      logVm("POST /api/vm/start", {
        status: res.status,
        ok: res.ok,
        durationMs,
        body: body.json ?? body.text,
      });

      if (!res.ok) {
        const error = body.json as { message?: string } | null;
        throw new Error(error?.message ?? "Failed to start VM");
      }
      return api.vm.start.responses[200].parse(body.json);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vm.get.path] });
    },
    onError: (error) => {
      logVm("POST /api/vm/start failed", { message: (error as Error).message });
    },
  });
}

// POST /api/vm/stop
export function useStopVm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const startedAt = performance.now();
      const res = await fetch(api.vm.stop.path, {
        method: api.vm.stop.method,
        headers: { "Content-Type": "application/json" },
      });
      const durationMs = Math.round(performance.now() - startedAt);
      const body = await readBodySafe(res);
      logVm("POST /api/vm/stop", {
        status: res.status,
        ok: res.ok,
        durationMs,
        body: body.json ?? body.text,
      });

      if (!res.ok) {
        const error = api.vm.stop.responses[400].parse(body.json);
        throw new Error(error.message);
      }
      return api.vm.stop.responses[200].parse(body.json);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vm.get.path] });
    },
    onError: (error) => {
      logVm("POST /api/vm/stop failed", { message: (error as Error).message });
    },
  });
}

// Snapshot hooks
export function useSnapshots() {
  return useQuery({
    queryKey: [api.vm.listSnapshots.path],
    queryFn: async () => {
      const startedAt = performance.now();
      const res = await fetch(api.vm.listSnapshots.path);
      const durationMs = Math.round(performance.now() - startedAt);
      const body = await readBodySafe(res);
      logVm("GET /api/vm/snapshots", {
        status: res.status,
        ok: res.ok,
        durationMs,
        body: body.json ?? body.text,
      });
      if (!res.ok) throw new Error("Failed to fetch snapshots");
      return body.json as Array<{ name: string; createdAt: string; size: number }>;
    },
    retry: false,
  });
}

// GET /api/vm/images
export function useStoredImages() {
  return useQuery({
    queryKey: [api.vm.listImages.path],
    queryFn: async () => {
      const startedAt = performance.now();
      const res = await fetch(api.vm.listImages.path);
      const durationMs = Math.round(performance.now() - startedAt);
      const body = await readBodySafe(res);
      logVm("GET /api/vm/images", {
        status: res.status,
        ok: res.ok,
        durationMs,
        body: body.json ?? body.text,
      });
      if (!res.ok) throw new Error("Failed to fetch stored images");
      return api.vm.listImages.responses[200].parse(body.json);
    },
    retry: false,
  });
}

// POST /api/vm/images/:id/mount
export function useMountStoredImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const startedAt = performance.now();
      const res = await fetch(`/api/vm/images/${id}/mount`, {
        method: api.vm.mountImage.method,
      });
      const durationMs = Math.round(performance.now() - startedAt);
      const body = await readBodySafe(res);
      logVm("POST /api/vm/images/:id/mount", {
        id,
        status: res.status,
        ok: res.ok,
        durationMs,
        body: body.json ?? body.text,
      });
      if (res.status === 404) {
        const error = api.vm.mountImage.responses[404].parse(body.json);
        throw new Error(error.message);
      }
      if (!res.ok) {
        const error = api.vm.mountImage.responses[400].parse(body.json);
        throw new Error(error.message);
      }
      return api.vm.mountImage.responses[200].parse(body.json);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vm.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.vm.listImages.path] });
    },
    onError: (error) => {
      logVm("POST /api/vm/images/:id/mount failed", { message: (error as Error).message });
    },
  });
}

// GET /api/vm/uploads
export function useLocalUploads() {
  return useQuery({
    queryKey: [api.vm.listUploads.path],
    queryFn: async () => {
      const startedAt = performance.now();
      const res = await fetch(api.vm.listUploads.path);
      const durationMs = Math.round(performance.now() - startedAt);
      const body = await readBodySafe(res);
      logVm("GET /api/vm/uploads", {
        status: res.status,
        ok: res.ok,
        durationMs,
        body: body.json ?? body.text,
      });
      if (!res.ok) throw new Error("Failed to fetch uploads");
      return api.vm.listUploads.responses[200].parse(body.json);
    },
    retry: false,
  });
}

// POST /api/vm/set-image
export function useSetVmImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (filename: string) => {
      const startedAt = performance.now();
      const res = await fetch(api.vm.setImage.path, {
        method: api.vm.setImage.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      const durationMs = Math.round(performance.now() - startedAt);
      const body = await readBodySafe(res);
      logVm("POST /api/vm/set-image", {
        status: res.status,
        ok: res.ok,
        durationMs,
        filename,
        body: body.json ?? body.text,
      });
      if (res.status === 404) {
        const error = api.vm.setImage.responses[404].parse(body.json);
        throw new Error(error.message);
      }
      if (!res.ok) {
        const error = api.vm.setImage.responses[400].parse(body.json);
        throw new Error(error.message);
      }
      return api.vm.setImage.responses[200].parse(body.json);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vm.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.vm.listUploads.path] });
    },
    onError: (error) => {
      logVm("POST /api/vm/set-image failed", { message: (error as Error).message });
    },
  });
}

export function useSaveSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const startedAt = performance.now();
      const res = await fetch(api.vm.saveSnapshot.path, {
        method: api.vm.saveSnapshot.method,
        headers: { "Content-Type": "application/json" },
      });
      const durationMs = Math.round(performance.now() - startedAt);
      const body = await readBodySafe(res);
      logVm("POST /api/vm/snapshot/save", {
        status: res.status,
        ok: res.ok,
        durationMs,
        body: body.json ?? body.text,
      });

      if (!res.ok) {
        const error = body.json as { message?: string } | null;
        throw new Error(error?.message ?? "Failed to save snapshot");
      }
      return body.json as { success: boolean; name: string; message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vm.listSnapshots.path] });
    },
    onError: (error) => {
      logVm("POST /api/vm/snapshot/save failed", { message: (error as Error).message });
    },
  });
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const startedAt = performance.now();
      const res = await fetch(`/api/vm/snapshot/${name}`, {
        method: 'DELETE',
      });
      const durationMs = Math.round(performance.now() - startedAt);
      const body = await readBodySafe(res);
      logVm("DELETE /api/vm/snapshot/:name", {
        name,
        status: res.status,
        ok: res.ok,
        durationMs,
        body: body.json ?? body.text,
      });

      if (!res.ok) {
        const error = body.json as { message?: string } | null;
        throw new Error(error?.message ?? "Failed to delete snapshot");
      }
      return body.json as { success: boolean; message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vm.listSnapshots.path] });
    },
    onError: (error) => {
      logVm("DELETE /api/vm/snapshot/:name failed", { message: (error as Error).message });
    },
  });
}

// PATCH /api/vm/settings
export function useUpdateVmSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: { ramMb?: number; vramMb?: number }) => {
      const startedAt = performance.now();
      const res = await fetch('/api/vm/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const durationMs = Math.round(performance.now() - startedAt);
      const body = await readBodySafe(res);
      logVm("PATCH /api/vm/settings", {
        status: res.status,
        ok: res.ok,
        durationMs,
        body: body.json ?? body.text,
        settings,
      });

      if (!res.ok) {
        const error = body.json as { message?: string } | null;
        throw new Error(error?.message ?? "Failed to update VM settings");
      }
      return body.json as unknown;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vm.get.path] });
    },
    onError: (error) => {
      logVm("PATCH /api/vm/settings failed", { message: (error as Error).message });
    },
  });
}

// POST /api/vm/start-from-snapshot
export function useStartFromSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (snapshotName: string) => {
      const startedAt = performance.now();
      const res = await fetch('/api/vm/start-from-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotName }),
      });
      const durationMs = Math.round(performance.now() - startedAt);
      const body = await readBodySafe(res);
      logVm("POST /api/vm/start-from-snapshot", {
        status: res.status,
        ok: res.ok,
        durationMs,
        body: body.json ?? body.text,
        snapshotName,
      });

      if (!res.ok) {
        const error = body.json as { message?: string } | null;
        throw new Error(error?.message ?? "Failed to start from snapshot");
      }
      return body.json as { success: boolean; message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vm.get.path] });
    },
    onError: (error) => {
      logVm("POST /api/vm/start-from-snapshot failed", { message: (error as Error).message });
    },
  });
}
