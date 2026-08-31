export interface ClinicData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  generalHours: string | null;
}

export interface ClinicRepository {
  find(): Promise<ClinicData | null>;
  update(data: { name?: string; address?: string; phone?: string; generalHours?: string }): Promise<ClinicData>;
}
