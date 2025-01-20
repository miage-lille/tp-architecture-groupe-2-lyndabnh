import { BookSeat } from './book-seat';
import { InMemoryWebinarRepository } from '../adapters/webinar-repository.in-memory';
import { InMemoryMailer } from 'src/core/adapters/in-memory-mailer';
import { Participation } from '../entities/participation.entity';

describe('Feature: Book a seat in a webinar', () => {
  let webinarRepository: InMemoryWebinarRepository;
  let participationRepository: { save: jest.Mock; findByWebinarId: jest.Mock };
  let mailer: InMemoryMailer;
  let useCase: BookSeat;

  beforeEach(() => {
    webinarRepository = new InMemoryWebinarRepository();
    participationRepository = {
      save: jest.fn(),
      findByWebinarId: jest.fn(),
    };
    mailer = new InMemoryMailer();
    useCase = new BookSeat(participationRepository, webinarRepository, mailer);
  });

  it('should book a seat successfully', async () => {
    const webinar = {
      props: {
        id: 'webinar-1',
        title: 'Webinar Test',
        organizerId: 'organizer-1',
        seats: 10,
      },
    };
    webinarRepository.database.push(webinar as any);
    participationRepository.findByWebinarId.mockResolvedValue([]);

    await useCase.execute({ webinarId: 'webinar-1', user: { id: 'user-1', email: 'user@test.com' } });

    expect(participationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ props: { userId: 'user-1', webinarId: 'webinar-1' } }),
    );
    expect(mailer.sentEmails).toHaveLength(1);
    expect(mailer.sentEmails[0]).toEqual(
      expect.objectContaining({
        to: 'organizer-1',
        subject: 'New participant registered',
      }),
    );
  });

  it('should throw an error if webinar is full', async () => {
    const webinar = {
      props: {
        id: 'webinar-1',
        title: 'Webinar Test',
        organizerId: 'organizer-1',
        seats: 1,
      },
    };
    webinarRepository.database.push(webinar as any);
    participationRepository.findByWebinarId.mockResolvedValue([
      new Participation({ userId: 'another-user', webinarId: 'webinar-1' }),
    ]);

    await expect(
      useCase.execute({ webinarId: 'webinar-1', user: { id: 'user-1', email: 'user@test.com' } }),
    ).rejects.toThrow('No seats available for this webinar');
  });

  it('should throw an error if user is already registered', async () => {
    const webinar = {
      props: {
        id: 'webinar-1',
        title: 'Webinar Test',
        organizerId: 'organizer-1',
        seats: 10,
      },
    };
    webinarRepository.database.push(webinar as any);
    participationRepository.findByWebinarId.mockResolvedValue([
      new Participation({ userId: 'user-1', webinarId: 'webinar-1' }),
    ]);

    await expect(
      useCase.execute({ webinarId: 'webinar-1', user: { id: 'user-1', email: 'user@test.com' } }),
    ).rejects.toThrow('User already registered for this webinar');
  });

  it('should throw an error if webinar is not found', async () => {
    participationRepository.findByWebinarId.mockResolvedValue([]);

    await expect(
      useCase.execute({ webinarId: 'non-existent-webinar', user: { id: 'user-1', email: 'user@test.com' } }),
    ).rejects.toThrow('Webinar not found');
  });
});
