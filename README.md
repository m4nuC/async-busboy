# Promised based multipart form parse

## Use cases:

- Form sending only octet-stream (files)

- Form sending file octet-stream (files) and input fields.
  a. File and fields are processed has they arrive. Their order do not matter.
  b. Fields must be processed (for example validated) before processing the files.