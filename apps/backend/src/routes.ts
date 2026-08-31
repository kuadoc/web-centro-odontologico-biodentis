import { Router } from "express";
import { authRoutes } from "./modules/auth/presentation/auth.routes";
import { userRoutes } from "./modules/users/presentation/user.routes";
import { dentistRoutes } from "./modules/dentists/presentation/dentist.routes";
import { appointmentRoutes } from "./modules/appointments/presentation/appointment.routes";
import { clinicalRecordRoutes } from "./modules/clinical-records/presentation/clinicalRecord.routes";
import { clinicRoutes } from "./modules/clinic/presentation/clinic.routes";
import { reportRoutes } from "./modules/reports/presentation/report.routes";

const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/dentists", dentistRoutes);
apiRouter.use("/appointments", appointmentRoutes);
apiRouter.use("/clinical-records", clinicalRecordRoutes);
apiRouter.use("/clinic", clinicRoutes);
apiRouter.use("/reports", reportRoutes);

export { apiRouter };
