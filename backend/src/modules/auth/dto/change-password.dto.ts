import { IsString, MinLength, Matches } from 'class-validator';
export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Senha deve ter ao menos 1 maiúscula, 1 minúscula e 1 número',
  })
  newPassword: string;
}
