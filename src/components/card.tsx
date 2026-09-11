import { Card as HeroCard } from 'heroui-native';

/**
 * Compound layout:
 *   <Card>
 *     <Card.Header>…</Card.Header>
 *     <Card.Body>
 *       <Card.Title>…</Card.Title>
 *       <Card.Description>…</Card.Description>
 *     </Card.Body>
 *     <Card.Footer>…</Card.Footer>
 *   </Card>
 *
 * Note it is Card.Body — not Card.Content, which is the web HeroUI name.
 */
export type CardProps = React.ComponentProps<typeof HeroCard>;
export const Card = HeroCard;
