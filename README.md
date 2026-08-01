### rtui
Small library for queueing and throttling UI events on a frontend.

Usually I want my frontend to queue events globally (if the user does several
UI actions, they generally want them to happen sequentially). In addition to that,
actions that happen within the same "bucket" (e.g. input events on the same slider,
up/down events on the same button, etc) are throttled: newly-received events
override ones that are already in the queue.
