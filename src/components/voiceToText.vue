<template>
    <Button
    @click="handleRecording()"
        :class="[
            'bg-transparent rounded-full! p-1! border-none transition-all duration-300',
            isRecording 
                ? 'recording-pulse bg-red-500/10! dark:bg-red-500/20!' 
                : 'hover:bg-primary-500/10! hover:dark:bg-primary-500/20!'
        ]"
    :style="{ width: props.size, height: props.size }"
        >
        <Mic v-if="!isRecording" class=" text-primary-700! dark:text-primary-300!" />
        <MicOff v-else class="text-red-500! animate-pulse" />
    </Button>
</template>
<script setup>
const props = defineProps({
    language: {
        type: String,
        default: 'ar'
    },
    size: {
        type: String,
        default: '44px'
    }
});
const output = defineModel();
const isRecording = ref(false);
const speechEndTimeout = ref(null);
const SILENCE_DURATION = 2000; // 2 seconds

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = true;

recognition.onstart = () => {
    isRecording.value = true;
};

recognition.onresult = (event) => {    
    const transcript = event.results[0][0].transcript;
    output.value = transcript;
};
const clearSpeechTimeout = () => {
    if (speechEndTimeout.value) {
        clearTimeout(speechEndTimeout.value);
        speechEndTimeout.value = null;
    }
};

recognition.onspeechstart = () => {
    console.log('speech started');
    clearSpeechTimeout();
};

recognition.onspeechend = () => {
    console.log('speech ended');
    clearSpeechTimeout();
    speechEndTimeout.value = setTimeout(() => {
        if (isRecording.value) {
            console.log('speech ended and timeout');
            handleRecording();
        }
    }, SILENCE_DURATION);
};
const handleRecording = () => {
    recognition.lang = props.language;
    if (isRecording.value) {
        recognition.stop();
        clearSpeechTimeout();
    } else {
        recognition.start();
    }
    isRecording.value = !isRecording.value;
};

</script>
<style scoped>
@keyframes recording-pulse {
    0%, 100% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
    }
    50% {
        box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
    }
}

.recording-pulse {
    animation: recording-pulse 1.5s ease-in-out infinite;
}
</style>
