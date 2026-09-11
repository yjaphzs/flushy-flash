import { TextField as HeroTextField, Label, Input, Description, FieldError } from 'heroui-native';

/**
 * TextField composes standalone parts rather than dot-notation subcomponents:
 *
 *   <TextField>
 *     <TextFieldLabel>Email</TextFieldLabel>
 *     <TextFieldInput value={email} onChangeText={setEmail} />
 *     <TextFieldDescription>Use your CLSU address to get verified.</TextFieldDescription>
 *     <TextFieldError>{error}</TextFieldError>
 *   </TextField>
 */
export type TextFieldProps = React.ComponentProps<typeof HeroTextField>;

export const TextField = HeroTextField;
export const TextFieldLabel = Label;
export const TextFieldInput = Input;
export const TextFieldDescription = Description;
export const TextFieldError = FieldError;
