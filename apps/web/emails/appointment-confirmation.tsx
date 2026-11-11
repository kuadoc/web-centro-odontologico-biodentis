import * as React from "react";
import { Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

interface AppointmentConfirmationEmailProps {
  patientName: string;
  dentistName: string;
  date: string;
  time: string;
  clinicName: string;
  serviceName?: string;
  specialtyName?: string;
  status?: "PENDING" | "CONFIRMED";
}

export default function AppointmentConfirmationEmail({
  patientName,
  dentistName,
  date,
  time,
  clinicName,
  serviceName,
  specialtyName,
  status = "CONFIRMED",
}: AppointmentConfirmationEmailProps) {
  const confirmed = status === "CONFIRMED";
  return (
    <Html>
      <Head />
      <Preview>{confirmed ? "Tu cita ha sido confirmada" : "Tu cita ha sido registrada y está pendiente de confirmación"} - {clinicName}</Preview>
      <Container style={container}>
        <Heading style={heading}>{confirmed ? "Cita confirmada" : "Cita registrada"}</Heading>
        <Text style={paragraph}>Hola {patientName},</Text>
        <Text style={paragraph}>{confirmed ? "Tu cita odontológica ha sido confirmada exitosamente:" : "Registramos tu solicitud de cita. Recepción debe confirmar la atención:"}</Text>
        <Container style={detailsBox}>
          <Text style={detailLabel}>Paciente:</Text>
          <Text style={detailValue}>{patientName}</Text>
          <Text style={detailLabel}>Odontólogo que te atenderá:</Text>
          <Text style={detailValue}>{dentistName}</Text>
          <Text style={detailLabel}>Fecha:</Text>
          <Text style={detailValue}>{date}</Text>
          <Text style={detailLabel}>Hora:</Text>
          <Text style={detailValue}>{time}</Text>
          {serviceName && <React.Fragment><Text style={detailLabel}>Servicio:</Text><Text style={detailValue}>{serviceName}</Text></React.Fragment>}
          {specialtyName && <React.Fragment><Text style={detailLabel}>Especialidad:</Text><Text style={detailValue}>{specialtyName}</Text></React.Fragment>}
          <Text style={detailLabel}>Estado:</Text>
          <Text style={detailValue}>{confirmed ? "Confirmada" : "Pendiente de confirmación"}</Text>
        </Container>
        <Text style={paragraph}>
          {confirmed ? `Te esperamos en ${clinicName}. Por favor, llega 10 minutos antes de tu hora agendada.` : "Recibirás otro correo cuando Recepción confirme tu cita."}
        </Text>
        <Text style={footer}>{clinicName}</Text>
      </Container>
    </Html>
  );
}

const container = {
  padding: "20px",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  backgroundColor: "#f9f9f9",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#333",
  marginBottom: "20px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.5",
  color: "#555",
  marginBottom: "10px",
};

const detailsBox = {
  backgroundColor: "#ffffff",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
  padding: "16px",
  margin: "20px 0",
};

const detailLabel = {
  fontSize: "14px",
  color: "#999",
  marginBottom: "4px",
  marginTop: "8px",
};

const detailValue = {
  fontSize: "16px",
  color: "#333",
  fontWeight: "bold",
  marginBottom: "8px",
};

const footer = {
  fontSize: "14px",
  color: "#999",
  marginTop: "30px",
  borderTop: "1px solid #eee",
  paddingTop: "20px",
};
