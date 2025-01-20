import { Executable } from 'src/shared/executable';
import { IMailer } from 'src/core/ports/mailer.interface';
import { IUserRepository } from 'src/users/ports/user-repository.interface';
import { IWebinarRepository } from 'src/webinars/ports/webinar-repository.interface';
import { IParticipationRepository } from 'src/webinars/ports/participation-repository.interface';
import { Participation } from 'src/webinars/entities/participation.entity';

type Request = {
  webinarId: string;
  user: { id: string; email: string };
};
type Response = void;

export class BookSeat implements Executable<Request, Response> {
  constructor(
    private readonly participationRepository: IParticipationRepository,
    private readonly webinarRepository: IWebinarRepository,
    private readonly mailer: IMailer,
  ) {}

  async execute({ webinarId, user }: Request): Promise<Response> {
    const webinar = await this.webinarRepository.findById(webinarId);
    if (!webinar) {
      throw new Error('Webinar not found');
    }

    const participants = await this.participationRepository.findByWebinarId(webinarId);
    if (participants.some((p) => p.props.userId === user.id)) {
      throw new Error('User already registered for this webinar');
    }

    if (webinar.props.seats <= participants.length) {
      throw new Error('No seats available for this webinar');
    }

    const participation = new Participation({ webinarId, userId: user.id });
    await this.participationRepository.save(participation);

    await this.mailer.send({
      to: webinar.props.organizerId,
      subject: 'New participant registered',
      body: `User with email ${user.email} has registered for the webinar ${webinar.props.title}.`,
    });
  }
}
