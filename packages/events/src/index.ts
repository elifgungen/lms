type Handler<T = void> = (payload: T) => void;

class SimpleEvent<T = void> {
    private handlers = new Set<Handler<T>>();

    on(handler: Handler<T>) {
        this.handlers.add(handler);
        return () => this.handlers.delete(handler);
    }

    emit(payload?: T) {
        this.handlers.forEach((h) => h(payload as T));
    }
}

export const unauthorizedEvent = new SimpleEvent();

export const tokenRefreshedEvent = new SimpleEvent<string | null>();

export { SimpleEvent };
