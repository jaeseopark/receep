class DuplicateUsernameException(Exception):
    pass


class DuplicateReceipt(Exception):
    def __init__(self, receipt_id=None):
        self.receipt_id = receipt_id
        super().__init__(f"Receipt already exists with id={receipt_id}")


class NotFound(Exception):
    pass
