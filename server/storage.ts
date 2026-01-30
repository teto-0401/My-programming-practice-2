
import { db } from "./db";
import { vms, type Vm, type InsertVm } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getVm(): Promise<Vm | undefined>;
  createOrUpdateVm(vm: Partial<InsertVm>): Promise<Vm>;
  updateVmStatus(id: number, status: string): Promise<Vm>;
  updateVmImage(id: number, imagePath: string): Promise<Vm>;
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

  async updateVmImage(id: number, imagePath: string): Promise<Vm> {
    const [updated] = await db.update(vms)
      .set({ imagePath })
      .where(eq(vms.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
