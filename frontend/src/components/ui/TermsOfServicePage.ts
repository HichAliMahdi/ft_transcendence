export class TermsOfServicePage {
    public render(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'container mx-auto p-8 fade-in';

        const card = document.createElement('div');
        card.className = 'max-w-4xl mx-auto glass-effect p-8 rounded-2xl';

        const title = document.createElement('h1');
        title.className = 'text-3xl font-bold text-white mb-6';
        title.textContent = 'Terms of Service';
        card.appendChild(title);

        const updated = document.createElement('p');
        updated.className = 'text-gray-300 mb-6';
        updated.textContent = 'Last updated: March 2026';
        card.appendChild(updated);

        card.appendChild(this.createSection(
            '1. Acceptance of Terms',
            'By using this application, you agree to these terms and to use the service only for lawful, educational, and fair gameplay purposes.'
        ));

        card.appendChild(this.createSection(
            '2. Account Responsibility',
            'You are responsible for activities on your account and for keeping your credentials and 2FA information private.'
        ));

        card.appendChild(this.createSection(
            '3. Fair Use',
            'Abusive behavior, cheating, or intentional disruption of matches, chat, or tournaments is not allowed.'
        ));

        card.appendChild(this.createSection(
            '4. Service Availability',
            'The service is provided as-is for educational use. Temporary downtime, maintenance, or feature changes may occur.'
        ));

        card.appendChild(this.createSection(
            '5. Limitation of Liability',
            'The project team is not liable for data loss or indirect damages resulting from use of this educational platform.',
            false
        ));

        container.appendChild(card);
        return container;
    }

    private createSection(headingText: string, paragraphText: string, withMargin: boolean = true): HTMLElement {
        const section = document.createElement('section');
        section.className = withMargin ? 'mb-6' : '';

        const heading = document.createElement('h2');
        heading.className = 'text-xl font-semibold text-white mb-2';
        heading.textContent = headingText;

        const paragraph = document.createElement('p');
        paragraph.className = 'text-gray-300';
        paragraph.textContent = paragraphText;

        section.appendChild(heading);
        section.appendChild(paragraph);
        return section;
    }

    public cleanup(): void {
        // No listeners or intervals on this page.
    }
}
