import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenScrollView } from '@/components/screen';
import { Text } from '@/components/text';
import { refreshClaims, resendVerification, signOut } from '@/features/auth/api';
import { useAuthStore, useIsVerifiedStudent } from '@/stores/auth-store';
import { CLSU_EMAIL_DOMAIN } from '@/lib/campus';

export default function SettingsScreen() {
  const email = useAuthStore((s) => s.email);
  const emailVerified = useAuthStore((s) => s.emailVerified);
  const verifiedStudent = useIsVerifiedStudent();

  return (
    <ScreenScrollView contentContainerClassName="px-4 py-4 gap-4">
      <Card>
        <Card.Body>
          <Card.Title>Student verification</Card.Title>
          <Card.Description>
            {verifiedStudent
              ? `Verified with ${email}.`
              : emailVerified
                ? `${email} is verified, but it is not a @${CLSU_EMAIL_DOMAIN} address.`
                : `Confirm ${email} to earn the student badge.`}
          </Card.Description>
        </Card.Body>
        {!emailVerified ? (
          <Card.Footer>
            <Button variant="secondary" onPress={() => resendVerification()}>
              <Button.Label>Resend verification email</Button.Label>
            </Button>
          </Card.Footer>
        ) : null}
      </Card>

      {/* Verifying an email does not rotate the ID token by itself, so the badge
          would not appear until the token happened to refresh. This forces it. */}
      <Button variant="secondary" onPress={() => refreshClaims()}>
        <Button.Label>I have verified — refresh</Button.Label>
      </Button>

      <Button variant="danger-soft" onPress={() => signOut()}>
        <Button.Label>Sign out</Button.Label>
      </Button>

      <Text className="text-center text-xs text-muted-foreground">Flushy Flash · CLSU</Text>
    </ScreenScrollView>
  );
}
