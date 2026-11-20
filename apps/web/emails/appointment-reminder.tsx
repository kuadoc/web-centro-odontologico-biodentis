import { Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

interface AppointmentReminderEmailProps {
  patientName: string;
  dentistName: string;
  date: string;
  time: string;
  clinicName: string;
}

export default function AppointmentReminderEmail({
  patientName,
  dentistName,
  date,
  time,
  clinicName,
}: AppointmentReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Recordatorio de tu cita - BIODENTIS</Preview>
      <Container style={container}>
        <Heading style={heading}>Recordatorio de cita</Heading>
        <Text style={paragraph}>Hola {patientName},</Text>
        <Text style={paragraph}>
          Te recordamos tu próxima cita odontológica:
        </Text>
        <Container style={detailsBox}>
          <Text style={detailLabel}>Profesional:</Text>
          <Text style={detailValue}>{dentistName}</Text>
          <Text style={detailLabel}>Fecha:</Text>
          <Text style={detailValue}>{date}</Text>
          <Text style={detailLabel}>Hora:</Text>
          <Text style={detailValue}>{time}</Text>
        </Container>
        <Text style={paragraph}>
          Por favor, llega 10 minutos antes de tu hora agendada. Si necesitas cancelar o reprogramar,
          hazlo con al menos 24 horas de anticipación.
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
