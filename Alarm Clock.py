import time
import datetime
import os

def set_alarm(alarm_time):
    print(f"Alarm is set for {alarm_time}")
    while True:
        current_time = datetime.datetime.now().strftime("%H:%M:%S")
        if current_time == alarm_time:
            print("Wake up!")
            os.system('start alarm.mp3')  # This will play an audio file named "alarm.mp3"
            break
        time.sleep(1)

# Get user input for alarm time
alarm_time = input("Enter the alarm time (HH:MM:SS format): ")

# Set the alarm
set_alarm(alarm_time)

