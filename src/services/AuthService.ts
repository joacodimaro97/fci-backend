import { ConflictError, UnauthorizedError } from '../errors/AppError.js';
import type { AuthResponseDto } from '../dto/index.js';
import type { IUserRepository } from '../repositories/IUserRepository.js';
import type { RegisterInput, LoginInput } from '../validators/auth.validator.js';
import { comparePassword, hashPassword, toPublicUser } from '../utils/index.js';

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly signToken: (payload: { sub: string; email: string }) => string,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponseDto> {
    const exists = await this.userRepository.existsByEmail(input.email);
    if (exists) {
      throw new ConflictError('El email ya está registrado');
    }

    const hashedPassword = await hashPassword(input.password);
    const user = await this.userRepository.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
    });

    const token = this.signToken({ sub: user.id, email: user.email });

    return {
      user: toPublicUser(user),
      token,
    };
  }

  async login(input: LoginInput): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const isValid = await comparePassword(input.password, user.password);
    if (!isValid) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const token = this.signToken({ sub: user.id, email: user.email });

    return {
      user: toPublicUser(user),
      token,
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findPublicById(userId);
    if (!user) {
      throw new UnauthorizedError('Usuario no encontrado');
    }
    return user;
  }
}
