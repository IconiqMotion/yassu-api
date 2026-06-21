import { IsString, MinLength } from 'class-validator';

export class AdminLoginDTO {
    @IsString()
    username: string;

    @IsString()
    @MinLength(6)
    password: string;
}

