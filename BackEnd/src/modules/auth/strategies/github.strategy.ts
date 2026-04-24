import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID') ?? '',
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') ?? '',
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL', 'http://localhost:3000/auth/github/callback'),
      scope: ['user:email'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: any,
  ): Promise<any> {
    const { id, username, emails, photos } = profile;

    const user = {
      githubId: id,
      email: emails?.[0]?.value,
      username: username,
      avatarUrl: photos?.[0]?.value,
      provider: 'github',
    };

    done(null, user);
  }
}