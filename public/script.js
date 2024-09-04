$(document).ready(function() {
    document.message_history = [];
    document.autoscroll = false;

    $(window).on('scroll', function() {
        document.autoscroll = false;
    });

    function addBubble(role, message, spinner = false) {
        var suffix = role === 'user' ? 'user' : 'assistant';
        if ( spinner ) {
            message = `<img class="spinner" src="spinner.gif">`;
        }
        var new_bubble = `
        <div class="content-container-${suffix}">
            <div class="speech-bubble-top-${suffix}"></div>
            <div class="speech-bubble-middle-${suffix}">
            <div class="speech-bubble-text-${suffix}">
                ${message}
            </div>
            </div>
            <div class="speech-bubble-bottom-${suffix}"></div>
            <div class="content-speech-arrow-${suffix}"></div>
        </div>
        `;

        $('.main-container').append(new_bubble);
    }


    function handleUserInput() {
        const userMessage = $('#searchbar').val();
        document.message_history.push({ role: 'user', content: userMessage });

        if (userMessage.trim() !== '') {
            addBubble('user', userMessage);

            fetch('/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    temperature: 0.3,
                    messages: document.message_history,
                    stream: true
                })
            })
            .then(response => {
                document.autoscroll = true;
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let currBubble;
                document.last_message = '';

                function createBubble() {
                    addBubble('assistant', '', true);
                    currBubble = $('.speech-bubble-text-assistant').last();
                }

                function processStream(resolve) {
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            if (buffer.trim() !== '[DONE]') {
                                try {
                                    if (buffer.trim().length > 0) {
                                        const data = JSON.parse(buffer);
                                        const assistantMessage = data.choices[0].delta.content.replace(/\n/g, '<br>');
                                        document.last_message += assistantMessage
                                        currBubble.append(assistantMessage);
                                    }
                                } catch (error) {
                                    console.error('Error parsing JSON:', error);
                                    $('.spinner').remove();
                                    currBubble.append('Sorry, there was an error processing your request.');
                                }
                            }
                            resolve();
                            return;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        let lines = buffer.split('\n');
                        buffer = lines.pop();

                        lines.forEach(line => {
                            if (line.startsWith('data: ')) {
                                const jsonString = line.slice(6);
                                if (jsonString.trim() === '[DONE]') {
                                    return;
                                }

                                try {
                                    const data = JSON.parse(jsonString);
                                    const assistantMessage = data.choices[0].delta.content.replace(/\n/g, '<br>');
                                    document.last_message += assistantMessage
                                    if (spinner) {
                                        $('.spinner').remove();
                                        spinner = false;
                                    }
                                    currBubble.append(assistantMessage);
                                    if (document.autoscroll) {
                                        $([document.documentElement, document.body]).animate({scrollTop: $('.content-speech-arrow-assistant').last().offset().top}, 500);
                                    }
                                } catch (error) {
                                    console.error('Error parsing JSON:', error);
                                }
                            }
                        });

                        processStream(resolve);
                    }).catch(error => {
                        console.error('Error reading stream:', error);
                        if (currBubble) {
                            $('.spinner').remove();
                            currBubble.append('Sorry, there was an error processing your request.');
                        }
                        resolve();
                    });
                }

                createBubble();
                var spinner = true;

                return new Promise(resolve => {
                    processStream(resolve);
                }).then(() => {
                    document.message_history.push({ role: 'assistant', content: document.last_message });
                });
            })
            .catch(error => {
                console.error('Fetch error:', error);
                if (currBubble) {
                    currBubble.append('Sorry, there was an error processing your request.');
                }
            });
        }

        $('#searchbar').val('').focus();
    }



    $('#ask-button').on('click', function() {
        handleUserInput();
    });



    $('#searchbar').on('keypress', function(event) {
        if (event.which === 13) {
        handleUserInput();
        }
    });
});
