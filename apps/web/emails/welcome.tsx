import { Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

interface WelcomeEmailProps {
  userName: string;
}

export default function WelcomeEmail({ userName }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>¡Bienvenido a BIODENTIS!</Preview>
      <Container style={container}>
        <Heading style={heading}>¡Bienvenido a BIODENTIS!</Heading>
        <Text style={paragraph}>Hola {userName},</Text>
        <Text style={paragraph}>
          Tu cuenta ha sido creada exitosamente. Ya puedes acceder a nuestra plataforma para agendar
          tus citas odontológicas y gestionar tu historial clínico.
        </Text>
        <Text style={paragraph}>
          Si tienes alguna consulta, no dudes en contactarnos.
        </Text>
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

const footer = {
  fontSize: "14px",
  color: "#999",
  marginTop: "30px",
  borderTop: "1px solid #eee",
  paddingTop: "20px",
};
