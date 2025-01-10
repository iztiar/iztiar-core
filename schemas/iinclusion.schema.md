# Iztiar

## IInclusion

This interface manage the modalities on new devices inclusion:

    - whether the implementation manages new devices inclusion

    - if yes, whether this requires a special 'inclusion mode' to be setup

        - if yes, whether there is a timeout aka auto-stop of the inclusion mode after a configurable delay

        - whether new commands may be created outside of this inclusion mode

            - manually (via some TCP commands, REST API, UI interface)
            - automatically
