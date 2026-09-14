import { Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

interface ResetPasswordEmailProps {
  userName: string;
  resetLink: string;
}

export default function ResetPasswordEmail({ userName, resetLink }: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Restablece tu contraseña - BIODENTIS</Preview>
      <Container style={container}>
        <Heading style={heading}>Restablece tu contraseña</Heading>
        <Text style={paragraph}>Hola {userName},</Text>
        <Text style={paragraph}>
          Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para
          crear una nueva:
        </Text>
        <Button href={resetLink} style={button}>
          Restablecer contraseña
        </Button>
        <Text style={paragraph}>
          Si no solicitaste este cambio, puedes ignorar este mensaje. Tu contraseña permanecerá sin
          cambios.
        </Text>
        <Text style={expiry}>Este enlace expirará en 30 minutos.</Text>
        <Text style={footer}>BIODENTIS Centro Odontológico Especializado</Text>
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

const button = {
  backgroundColor: "#0070f3",
  color: "#ffffff",
  padding: "14px 28px",
  borderRadius: "8px",
  textDecoration: "none",
  fontSize: "16px",
  fontWeight: "bold",
  display: "inline-block",
  margin: "20px 0",
};

const expiry = {
  fontSize: "14px",
  color: "#999",
  marginTop: "20px",
};

const footer = {
  fontSize: "14px",
  color: "#999",
  marginTop: "30px",
  borderTop: "1px solid #eee",
  paddingTop: "20px",
};
