
import { db } from "./db";
import { vms, vmImages, type Vm, type InsertVm, type VmImage, type InsertVmImage } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getVm(): Promise<Vm | undefined>;
  createOrUpdateVm(vm: Partial<InsertVm>): Promise<Vm>;
  updateVmStatus(id: number, status: string): Promise<Vm>;
  updateVmImage(id: number, imagePath: string, imageFilename?: string): Promise<Vm>;
  updateVmSettings(id: number, settings: { ramMb?: number; vramMb?: number }): Promise<Vm>;
  listImages(): Promise<VmImage[]>;
  createImage(image: InsertVmImage): Promise<VmImage>;
  getImage(id: number): Promise<VmImage | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Singleton-like behavior for the single VM
  async getVm(): Promise<Vm | undefined> {
    const [vm] = await db.select().from(vms).limit(1);
    return vm;
  }

  async createOrUpdateVm(updates: Partial<InsertVm>): Promise<Vm> {
    const existing = await this.getVm();
    
    if (existing) {
      const [updated] = await db.update(vms)
        .set(updates)
        .where(eq(vms.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(vms)
        .values({
          name: "Default VM",
          status: "stopped",
          ...updates
        } as InsertVm)
        .returning();
      return created;
    }
  }

  async updateVmStatus(id: number, status: string): Promise<Vm> {
    const [updated] = await db.update(vms)
      .set({ status })
      .where(eq(vms.id, id))
      .returning();
    return updated;
  }

  async updateVmImage(id: number, imagePath: string, imageFilename?: string): Promise<Vm> {
    const [updated] = await db.update(vms)
      .set({ imagePath, imageFilename })
      .where(eq(vms.id, id))
      .returning();
    return updated;
  }

  async updateVmSettings(id: number, settings: { ramMb?: number; vramMb?: number }): Promise<Vm> {
    const [updated] = await db.update(vms)
      .set(settings)
      .where(eq(vms.id, id))
      .returning();
    return updated;
  }

  async listImages(): Promise<VmImage[]> {
    return db.select().from(vmImages).orderBy(vmImages.createdAt);
  }

  async createImage(image: InsertVmImage): Promise<VmImage> {
    const [created] = await db.insert(vmImages).values(image).returning();
    return created;
  }

  async getImage(id: number): Promise<VmImage | undefined> {
    const [image] = await db.select().from(vmImages).where(eq(vmImages.id, id)).limit(1);
    return image;
  }
}

export const storage = new DatabaseStorage();
