from logging import Formatter, Handler

FMT = "[%(levelname)s] %(filename)s:%(lineno)d %(funcName)s %(message)s"


def set_format(handler: Handler) -> Handler:
    handler.formatter = Formatter(FMT)
    return handler
