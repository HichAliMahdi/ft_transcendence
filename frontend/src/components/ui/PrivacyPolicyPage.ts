export class PrivacyPolicyPage {
    public render(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'container mx-auto p-8 fade-in';

        const card = document.createElement('div');
        card.className = 'max-w-4xl mx-auto glass-effect p-8 rounded-2xl';

        const title = document.createElement('h1');
        title.className = 'text-3xl font-bold text-white mb-6';
        title.textContent = 'Privacy Policy';
        card.appendChild(title);

        const updated = document.createElement('p');
        updated.className = 'text-gray-300 mb-6';
        updated.textContent = 'Last updated: March 2026';
        card.appendChild(updated);

        card.appendChild(this.createSection(
            '1. Data We Collect',
            'We collect account details such as username, display name, email, and gameplay-related data such as match and tournament results.'
        ));

        card.appendChild(this.createSection(
            '2. Why We Use Data',
            'Your data is used to authenticate your account, provide multiplayer functionality, show statistics, and improve the stability of the platform.'
        ));

        card.appendChild(this.createSection(
            '3. Data Retention',
            'We keep data only for as long as required to provide the service and evaluate project functionality. Test data can be removed on request.'
        ));

        card.appendChild(this.createSection(
            '4. Data Sharing',
            'We do not sell personal data. Information is shared only with core project services required to run authentication, game sessions, and tournament features.'
        ));

        card.appendChild(this.createSection(
            '5. Contact',
            'If you have privacy questions, contact the project team through the repository communication channel.',
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
